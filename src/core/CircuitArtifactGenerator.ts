import fs from "fs";
import path from "path";

import { InternalType, SignalTypeNames, SignalVisibilityNames } from "../constants";
import {
  Stmt,
  Signal,
  Result,
  Template,
  CircuitAST,
  SignalType,
  Declaration,
  CircuitArtifact,
  SignalVisibility,
  CircomCompilerOutput,
  ArtifactGeneratorConfig,
} from "../types";

import { ASTParserError } from "../errors";
import { ErrorObj } from "../errors/common";

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

  /**
   * The default format version of the circuit artifact.
   */
  public static readonly DEFAULT_CIRCUIT_FORMAT: string = "zktype-circom-artifact-default";

  private readonly _projectRoot: string;
  private readonly _circuitArtifactGeneratorConfig: ArtifactGeneratorConfig;

  /**
   * Creates an instance of CircuitArtifactGenerator.
   * @param {ArtifactGeneratorConfig} circuitArtifactGeneratorConfig - The configuration for the `CircuitArtifactGenerator`.
   */
  constructor(circuitArtifactGeneratorConfig: ArtifactGeneratorConfig) {
    this._projectRoot = circuitArtifactGeneratorConfig.projectRoot;
    this._circuitArtifactGeneratorConfig = circuitArtifactGeneratorConfig;
  }

  /**
   * Generates circuit artifacts based on the ASTs.
   */
  public async generateCircuitArtifacts(): Promise<ErrorObj[]> {
    const astFilePaths = this._circuitArtifactGeneratorConfig.circuitsASTPaths;

    const errors: ErrorObj[] = [];

    for (const astFilePath of astFilePaths) {
      const circuitArtifact = await this.getCircuitArtifact(astFilePath);

      if (circuitArtifact.error) {
        errors.push(circuitArtifact.error);
      }

      this._saveArtifact(circuitArtifact.data, this._circuitArtifactGeneratorConfig.basePath);
    }

    return errors;
  }

  /**
   * Returns the configuration of the `CircuitArtifactGenerator`.
   */
  public getOutputArtifactsDir(): string {
    const relativePath: string = this._circuitArtifactGeneratorConfig.outputArtifactsDir ?? "artifacts/circuits";

    return path.join(this._projectRoot, relativePath);
  }

  /**
   * Extracts the artifact information from the AST JSON file.
   *
   * All the fields that are required for the artifact are extracted from the AST are validated.
   *
   * Will throw an error if:
   * - The AST is missing.
   * - _validateCircuitAST function fails.
   *
   * Will return an error if failed to get necessary information from the AST.
   *
   * @param {string} pathToTheAST - The path to the AST JSON file.
   * @returns {Promise<CircuitArtifact>} A promise that resolves to the extracted circuit artifact.
   */
  public async getCircuitArtifact(pathToTheAST: string): Promise<Result<CircuitArtifact>> {
    try {
      return {
        data: await this._extractArtifact(pathToTheAST),
        error: null,
      };
    } catch (error: any | ASTParserError) {
      return {
        data: this._getDefaultArtifact(pathToTheAST, CircuitArtifactGenerator.DEFAULT_CIRCUIT_FORMAT),
        error: error,
      };
    }
  }

  /**
   * Returns the template arguments for the circuit.
   *
   * @param circuitArtifact - The circuit artifact.
   * @param {string[]} args - The arguments of the template.
   * @param {any[]} names - The names of the arguments.
   * @returns {Record<string, bigint>} The template arguments for the circuit.
   */
  private getTemplateArgs(circuitArtifact: CircuitArtifact, args: string[], names: any[]): Record<string, bigint> {
    if (args.length === 0) {
      return {};
    }

    const result: Record<string, bigint> = {};

    for (let i = 0; i < args.length; i++) {
      const argObj = (args[i] as any)["Number"];

      result[names[i]] = BigInt(this.resolveNumber(circuitArtifact, argObj));
    }

    return result;
  }

  /**
   * Resolves the variable from
   */
  private resolveVariable(circuitArtifact: CircuitArtifact, variableObj: any) {
    if (!variableObj || !variableObj.name) {
      throw new ASTParserError(
        this._getCircuitFullName(circuitArtifact),
        `The argument is not a variable`,
        variableObj,
      );
    }

    return variableObj.name;
  }

  /**
   * Resolves the number from the AST.
   */
  private resolveNumber(circuitArtifact: CircuitArtifact, numberObj: any) {
    if (!numberObj || !numberObj.length || numberObj.length < 2) {
      throw new ASTParserError(this._getCircuitFullName(circuitArtifact), `The argument is not a number`, numberObj);
    }

    if (!numberObj[1] || !numberObj[1].length || numberObj[1].length < 2) {
      throw new ASTParserError(
        this._getCircuitFullName(circuitArtifact),
        `The argument is of unexpected format`,
        numberObj,
      );
    }

    const actualArg = numberObj[1][1];

    if (!actualArg || !actualArg.length || numberObj[1].length < 1) {
      throw new ASTParserError(
        this._getCircuitFullName(circuitArtifact),
        `The argument is of unexpected format`,
        actualArg,
      );
    }

    return actualArg[0];
  }

  /**
   * Resolves the dimensions of the signal.
   */
  private resolveDimension(circuitArtifact: CircuitArtifact, dimensions: number[]): number[] {
    const result: number[] = [];

    for (const dimension of dimensions) {
      if (dimension === 0) {
        result.push(0);

        continue;
      }

      const numberObj = (dimension as any)["Number"];
      const variableObj = (dimension as any)["Variable"];

      if (
        (numberObj !== undefined && variableObj !== undefined) ||
        (numberObj === undefined && variableObj === undefined)
      ) {
        throw new ASTParserError(
          this._getCircuitFullName(circuitArtifact),
          `The dimension is of unexpected format`,
          dimension,
        );
      }

      if (numberObj) {
        result.push(this.resolveNumber(circuitArtifact, numberObj));

        continue;
      }

      result.push(this.resolveVariable(circuitArtifact, variableObj));
    }

    return result;
  }

  /**
   * Cleans the artifacts directory by removing all files and subdirectories.
   */
  public cleanArtifacts(): void {
    const artifactsDir = this.getOutputArtifactsDir();

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
      .join(this.getOutputArtifactsDir(), artifact.sourceName.replace(commonPath, ""))
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
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact.
   * @param {CircomCompilerOutput[]} compilerOutputs - The compiler outputs of the circuit.
   * @returns {Template} The template for the circuit.
   */
  private _findTemplateForCircuit(circuitArtifact: CircuitArtifact, compilerOutputs: CircomCompilerOutput[]): Template {
    for (const compilerOutput of compilerOutputs) {
      if (!compilerOutput.definitions || compilerOutput.definitions.length < 1) {
        continue;
      }

      for (const definition of compilerOutput.definitions) {
        if (!definition.Template) {
          continue;
        }

        if (definition.Template.name === circuitArtifact.circuitName) {
          return definition.Template;
        }
      }
    }

    throw new ASTParserError(
      this._getCircuitFullName(circuitArtifact),
      `The template for the circuit could not be found.`,
      undefined,
    );
  }

  /**
   * Extracts the artifact information from the AST JSON file.
   *
   * @param {string} pathToTheAST - The path to the AST JSON file.
   * @returns {Promise<CircuitArtifact>} A promise that resolves to the extracted circuit artifact.
   */
  private async _extractArtifact(pathToTheAST: string): Promise<CircuitArtifact> {
    const ast: CircuitAST | undefined = JSON.parse(fs.readFileSync(pathToTheAST, "utf-8"));

    if (!ast) {
      throw new Error(`The circuit AST is missing. Path: ${pathToTheAST}`);
    }

    const circuitArtifact: CircuitArtifact = this._getDefaultArtifact(pathToTheAST);

    const template = this._findTemplateForCircuit(circuitArtifact, ast.circomCompilerOutput);
    const templateArgs = this.getTemplateArgs(
      circuitArtifact,
      ast.circomCompilerOutput[0].main_component![1].Call.args,
      template.args,
    );

    for (const statement of template.body.Block.stmts) {
      if (
        !statement.InitializationBlock ||
        !this._validateInitializationBlock(circuitArtifact, ast.sourcePath, statement.InitializationBlock) ||
        statement.InitializationBlock.xtype.Signal[0] === SignalTypeNames.Intermediate
      ) {
        continue;
      }

      const dimensions = this.resolveDimension(
        circuitArtifact,
        statement.InitializationBlock.initializations[0].Declaration.dimensions,
      );
      const resolvedDimensions = dimensions.map((dimension: any) => {
        if (typeof dimension === "string") {
          const templateArg = templateArgs[dimension];

          if (!templateArg) {
            throw new ASTParserError(
              this._getCircuitFullName(circuitArtifact),
              `The template argument is missing in the circuit ${circuitArtifact.circuitName}`,
              dimension,
            );
          }

          return Number(templateArg);
        }

        return Number(dimension);
      });

      const signal: Signal = {
        type: statement.InitializationBlock.xtype.Signal[0] as SignalType,
        internalType: this._getInternalType(statement.InitializationBlock.initializations[0].Declaration),
        visibility: this._getSignalVisibility(ast.circomCompilerOutput[0], statement),
        name: statement.InitializationBlock.initializations[0].Declaration.name,
        dimensions: resolvedDimensions,
      };

      circuitArtifact.signals.push(signal);
    }

    return circuitArtifact;
  }

  /**
   * Creates a default circuit artifact.
   *
   * @param {string} pathToTheAST - The path to the AST JSON file.
   * @param {string} format - The format of the circuit artifact.
   * @returns {CircuitArtifact} The default circuit artifact.
   */
  private _getDefaultArtifact(pathToTheAST: string, format?: string): CircuitArtifact {
    const ast: CircuitAST | undefined = JSON.parse(fs.readFileSync(pathToTheAST, "utf-8"));

    if (!ast) {
      throw new Error(`The circuit AST is missing. Path: ${pathToTheAST}`);
    }

    this._validateCircuitAST(ast);

    return {
      _format: format ?? CircuitArtifactGenerator.CURRENT_FORMAT,
      circuitName: ast.circomCompilerOutput[0].main_component![1].Call.id,
      sourceName: ast.sourcePath,
      basePath: this._circuitArtifactGeneratorConfig.basePath,
      compilerVersion: ast.circomCompilerOutput[0].compiler_version.join("."),
      signals: [],
    };
  }

  /**
   * Validates the AST of a circuit to ensure it meets the expected structure.
   *
   * @param {CircuitAST} ast - The AST of the circuit to be validated.
   *
   * @throws {Error} If the AST does not meet the expected structure.
   */
  private _validateCircuitAST(ast: CircuitAST): void {
    if (!ast.circomCompilerOutput) {
      throw new Error(`The circomCompilerOutput field is missing in the circuit AST: ${ast.sourcePath}`);
    }

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
   * @param {CircuitArtifact} circuitArtifact - The default circuit artifact.
   * @param {string} astSourcePath - The source path of the AST.
   * @param {any} initializationBlock - The initialization block to be validated.
   *
   * @returns {boolean} Returns `true` if the initialization block is valid, `false` otherwise.
   * @throws {Error} If the initialization block is missing required fields.
   */
  private _validateInitializationBlock(
    circuitArtifact: CircuitArtifact,
    astSourcePath: string,
    initializationBlock: any,
  ): boolean {
    if (!initializationBlock.xtype) {
      throw new ASTParserError(
        this._getCircuitFullName(circuitArtifact),
        `The initialization block xtype is missing in the circuit AST`,
        initializationBlock,
      );
    }

    if (
      !initializationBlock.initializations ||
      initializationBlock.initializations.length < 1 ||
      !initializationBlock.initializations[0].Declaration ||
      !initializationBlock.initializations[0].Declaration.name
    ) {
      throw new ASTParserError(
        this._getCircuitFullName(circuitArtifact),
        `The initializations field of initialization block is missing or incomplete in the circuit AST: ${astSourcePath}`,
        initializationBlock,
      );
    }

    if (!initializationBlock.xtype.Signal || initializationBlock.xtype.Signal.length < 1) {
      return false;
    }

    return true;
  }

  /**
   * Returns the full name of the circuit.
   *
   * @param {CircuitArtifact} artifact - The circuit artifact.
   * @returns {string} The full name of the circuit.
   */
  private _getCircuitFullName(artifact: CircuitArtifact): string {
    return `${artifact.sourceName}:${artifact.circuitName}`;
  }
}
