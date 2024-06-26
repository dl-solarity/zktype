import fs from "fs";
import path from "path";

import { findProjectRoot } from "../utils";

import { InternalType, SignalTypeNames, SignalVisibilityNames } from "../constants";
import {
  Stmt,
  Signal,
  Template,
  CircuitAST,
  SignalType,
  Declaration,
  CircuitArtifact,
  SignalVisibility,
  CircomCompilerOutput,
  ArtifactGeneratorConfig,
} from "../types";

/**
 * `CircuitArtifactGenerator` is responsible for generating circuit artifacts based on the AST files.
 *
 * The artifact is a JSON file which can be used further in the pipeline for type generation, strict typing natively by TypeScript, etc.
 * If the format of the artifact changes, the `CURRENT_FORMAT` constant should be updated for backward compatibility.
 *
 * This class mainly parses and validates the generated AST JSONs. Validation is needed to ensure that the generated AST files meet expectations and necessary
 * fields exist.
 */
export default class CircuitArtifactGenerator {
  /**
   * The current format version of the circuit artifact.
   */
  public static readonly CURRENT_FORMAT: string = "zktype-circom-artifact-1";

  private readonly _projectRoot: string;
  private readonly _circuitArtifactGeneratorConfig: ArtifactGeneratorConfig;

  /**
   * Creates an instance of CircuitArtifactGenerator.
   * @param {ArtifactGeneratorConfig} circuitArtifactGeneratorConfig - The configuration for the `CircuitArtifactGenerator`.
   */
  constructor(circuitArtifactGeneratorConfig: ArtifactGeneratorConfig) {
    this._projectRoot = findProjectRoot(process.cwd());
    this._circuitArtifactGeneratorConfig = circuitArtifactGeneratorConfig;
  }

  /**
   * Generates circuit artifacts based on the ASTs.
   */
  public async generateCircuitArtifacts(): Promise<void> {
    const astFilePaths = this._circuitArtifactGeneratorConfig.circuitsASTPaths;

    for (const astFilePath of astFilePaths) {
      const circuitArtifact = await this.extractArtifact(astFilePath);

      this._saveArtifact(
        {
          ...circuitArtifact,
          basePath: this._circuitArtifactGeneratorConfig.basePath,
        },
        this._circuitArtifactGeneratorConfig.basePath,
      );
    }
  }

  /**
   * Returns the configuration of the `CircuitArtifactGenerator`.
   */
  public getOutputArtifactsDir(): string {
    return this._circuitArtifactGeneratorConfig.outputArtifactsDir ?? "artifacts/circuits";
  }

  /**
   * Extracts the artifact information from the AST JSON file.
   *
   * All the fields that are required for the artifact are extracted from the AST are validated.
   *
   * @param {string} pathToTheAST - The path to the AST JSON file.
   * @returns {Promise<CircuitArtifact>} A promise that resolves to the extracted circuit artifact.
   */
  public async extractArtifact(pathToTheAST: string): Promise<CircuitArtifact> {
    const ast: CircuitAST = JSON.parse(fs.readFileSync(pathToTheAST, "utf-8"));

    this._validateCircuitAST(ast);

    const circuitArtifact: CircuitArtifact = {
      _format: CircuitArtifactGenerator.CURRENT_FORMAT,
      circuitName: ast.circomCompilerOutput[0].main_component![1].Call.id,
      sourceName: ast.sourcePath,
      basePath: "",
      compilerVersion: ast.circomCompilerOutput[0].compiler_version.join("."),
      signals: [],
    };

    const template = this._findTemplateForCircuit(ast.circomCompilerOutput, circuitArtifact.circuitName);

    for (const statement of template.body.Block.stmts) {
      if (
        !statement.InitializationBlock ||
        !this._validateInitializationBlock(ast.sourcePath, statement.InitializationBlock) ||
        statement.InitializationBlock.xtype.Signal[0] === SignalTypeNames.Intermediate
      ) {
        continue;
      }

      const signal: Signal = {
        type: statement.InitializationBlock.xtype.Signal[0] as SignalType,
        internalType: this._getInternalType(statement.InitializationBlock.initializations[0].Declaration),
        visibility: this._getSignalVisibility(ast.circomCompilerOutput[0], statement),
        name: statement.InitializationBlock.initializations[0].Declaration.name,
        dimensions: statement.InitializationBlock.initializations[0].Declaration.dimensions.length,
      };

      circuitArtifact.signals.push(signal);
    }

    return circuitArtifact;
  }

  /**
   * Cleans the artifacts directory by removing all files and subdirectories.
   */
  public cleanArtifacts(): void {
    const artifactsDir = path.join(this._projectRoot, this.getOutputArtifactsDir());

    if (fs.existsSync(artifactsDir)) {
      fs.rmSync(artifactsDir, { recursive: true, force: true });
    }
  }

  /**
   * Saves the circuit artifact to a JSON file.
   *
   * @param {CircuitArtifact} artifact - The circuit artifact to be saved.
   * @param commonPath - The common path of the circuit artifacts.
   */
  private _saveArtifact(artifact: CircuitArtifact, commonPath: string = ""): void {
    const circuitArtifactPath = path
      .join(this._projectRoot, this.getOutputArtifactsDir(), artifact.sourceName.replace(commonPath, ""))
      .replace(path.extname(artifact.sourceName), ".json");

    fs.mkdirSync(circuitArtifactPath.replace(path.basename(circuitArtifactPath), ""), { recursive: true });

    fs.writeFileSync(circuitArtifactPath, JSON.stringify(artifact, null, 2));
  }

  /**
   * Determines the internal type of declared variable based on its dimensions.
   *
   * This method checks if the declared variable has dimensions. If the variable has non-empty dimensions,
   * it is considered an array.
   *
   * @param {Declaration} declaration - The declaration to check.
   * @returns {string} The internal type of the declared variable, either 'bigint' or 'bigint[]'.
   */
  private _getInternalType(declaration: Declaration): string {
    if (declaration.dimensions.length > 0) {
      return InternalType.BigIntArray;
    }

    return InternalType.BigInt;
  }

  /**
   * Determines the visibility of a signal based on the circuit compiler output and the statement.
   *
   * If the signal is used in the main component or is an output signal, it is considered public.
   *
   * @param {CircomCompilerOutput} compilerOutput - The compiler output of the circuit.
   * @param {Stmt} statement - The statement to check.
   * @returns {SignalVisibility} The visibility of the signal.
   */
  private _getSignalVisibility(compilerOutput: CircomCompilerOutput, statement: Stmt): SignalVisibility {
    const signalName = statement.InitializationBlock!.initializations[0].Declaration.name;

    if (
      compilerOutput.main_component![0].includes(signalName) ||
      statement.InitializationBlock?.initializations[0].Declaration.xtype.Signal[0] === SignalTypeNames.Output
    ) {
      return SignalVisibilityNames.Public;
    }

    return SignalVisibilityNames.Private;
  }

  /**
   * Finds the template for the circuit based on the circuit name.
   *
   * @param {CircomCompilerOutput[]} compilerOutputs - The compiler outputs of the circuit.
   * @param {string} circuitName - The name of the circuit.
   * @returns {Template} The template for the circuit.
   */
  private _findTemplateForCircuit(compilerOutputs: CircomCompilerOutput[], circuitName: string): Template {
    for (const compilerOutput of compilerOutputs) {
      if (
        !compilerOutput.definitions ||
        compilerOutput.definitions.length < 1 ||
        !compilerOutput.definitions[0].Template
      ) {
        continue;
      }

      const template = compilerOutput.definitions[0].Template;

      if (template.name === circuitName) {
        return template;
      }
    }

    throw new Error(`The template for the circuit ${circuitName} could not be found.`);
  }

  /**
   * Validates the AST of a circuit to ensure it meets the expected structure.
   *
   * @param {CircuitAST} ast - The AST of the circuit to be validated.
   *
   * @throws {Error} If the AST does not meet the expected structure.
   */
  private _validateCircuitAST(ast: CircuitAST): void {
    if (
      ast.circomCompilerOutput.length < 1 ||
      !ast.circomCompilerOutput[0].main_component ||
      ast.circomCompilerOutput[0].main_component.length < 2 ||
      !ast.circomCompilerOutput[0].main_component[1].Call
    ) {
      throw new Error(`The main component is missing or incomplete in the circuit AST: ${ast.sourcePath}`);
    }

    if (!ast.circomCompilerOutput[0].compiler_version) {
      throw new Error(`The compiler version is missing in the circuit AST: ${ast.sourcePath}`);
    }

    if (!ast.circomCompilerOutput[0].main_component[1].Call.id) {
      throw new Error(`The main component id is missing in the circuit AST: ${ast.sourcePath}`);
    }
  }

  /**
   * Validates the initialization block in the circuit AST.
   *
   * @param {string} astSourcePath - The source path of the AST.
   * @param {any} initializationBlock - The initialization block to be validated.
   *
   * @returns {boolean} Returns `true` if the initialization block is valid, `false` otherwise.
   * @throws {Error} If the initialization block is missing required fields.
   */
  private _validateInitializationBlock(astSourcePath: string, initializationBlock: any): boolean {
    if (!initializationBlock.xtype) {
      throw new Error(`The initialization block xtype is missing in the circuit AST: ${astSourcePath}`);
    }

    if (
      !initializationBlock.initializations ||
      initializationBlock.initializations.length < 1 ||
      !initializationBlock.initializations[0].Declaration ||
      !initializationBlock.initializations[0].Declaration.name
    ) {
      throw new Error(
        `The initializations field of initialization block is missing or incomplete in the circuit AST: ${astSourcePath}`,
      );
    }

    if (!initializationBlock.xtype.Signal || initializationBlock.xtype.Signal.length < 1) {
      return false;
    }

    return true;
  }
}
