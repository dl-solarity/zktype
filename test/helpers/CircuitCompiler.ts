import fs from "fs";
import path from "path";

// @ts-ignore
import * as snarkjs from "snarkjs";

const { execSync } = require("child_process");

const { CircomRunner, bindings } = require("@distributedlab/circom2");

import { CircuitAST } from "../../src";

import { findProjectRoot } from "../../src/utils";

/**
 * `CircuitCompiler` serves as an interface to the Circom compiler for the first step in the circuit types generation process.
 * Its primary function is to generate the Abstract Syntax Tree (AST) for a given circuit file.
 *
 * It is designed to work independently of any filtering logic, acting solely as a conduit to the compiler.
 */
export default class CircuitCompiler {
  public readonly projectRoot: string;

  private readonly _wasmBytes: Buffer;

  constructor(
    private outputDir: string,
    private defaultDir: string,
    private quiet: boolean = false,
  ) {
    this.projectRoot = findProjectRoot(process.cwd());

    const tempDirPath = path.join(this.projectRoot, this.outputDir);

    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }

    this._wasmBytes = fs.readFileSync(require.resolve("@distributedlab/circom2/circom.wasm"));
  }

  /**
   * Asynchronously generates the Abstract Syntax Tree (AST) for a specified circuit file.
   * This method sets up the necessary arguments and environment for invoking the CircomRunner.
   *
   * In case if the file can not be compiled, the method will log the error and return false.
   *
   * @param {string} filePath - The path to the circuit file to be compiled into an AST.
   * @returns {Promise<boolean>} A promise that resolves to true if the AST was generated successfully, otherwise false.
   */
  public async generateCircuitAST(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`The specified circuit file does not exist: ${filePath}`);
    }

    const sourcePath = this._extractSourcePath(filePath);
    const circuitName = this._extractCircuitName(filePath);

    this._createCircuitASTDirectory(sourcePath);

    const astFilePath = this._getFutureASTFilePath(sourcePath, circuitName);

    const args = ["--dry_run", "--save_ast", astFilePath, "--", filePath];

    try {
      await this._getCircomRunner(args, true).execute(this._wasmBytes);

      const circuitAST: CircuitAST = {
        sourcePath: path.relative(this.projectRoot, filePath),
        circomCompilerOutput: JSON.parse(fs.readFileSync(astFilePath, "utf-8")),
      };

      fs.writeFileSync(astFilePath, JSON.stringify(circuitAST));

      return true;
    } catch (error) {
      await this._displayCircuitGenerationError(circuitName, args);

      return false;
    }
  }

  public async compileCircuit(filePath: string, outputDir: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`The specified circuit file does not exist: ${filePath}`);
    }

    const circuitName = this._extractCircuitName(filePath);

    fs.mkdirSync(path.join(this.projectRoot, outputDir), { recursive: true });

    const args = [
      path.join(this.projectRoot, filePath),
      "--output",
      path.join(this.projectRoot, outputDir),
      "--wasm",
      "--json",
      "--r1cs",
    ];

    try {
      await this._getCircomRunner(args, true).execute(this._wasmBytes);

      await this._generateZKeyFile(outputDir, circuitName);
      await this._generateVKeyFile(outputDir, circuitName);

      return true;
    } catch (error) {
      await this._displayCircuitGenerationError(circuitName, args);

      console.error(error);

      return false;
    }
  }

  private async _generateZKeyFile(outputDir: string, circuitName: string) {
    const r1csFile = `${path.join(this.projectRoot, outputDir)}/${circuitName}.r1cs`;
    const zKeyFile = `${path.join(this.projectRoot, outputDir)}/${circuitName}.zkey`;

    await snarkjs.zKey.newZKey(
      r1csFile,
      path.join(this.projectRoot, "test/helpers/powersOfTau28_hez_final_08.ptau"),
      zKeyFile,
    );
  }

  private async _generateVKeyFile(outputDir: string, circuitName: string) {
    const zkeyFile = `${path.join(this.projectRoot, outputDir)}/${circuitName}.zkey`;
    const vKeyFile = `${path.join(this.projectRoot, outputDir)}/${circuitName}.vkey.json`;

    const vKeyData = await snarkjs.zKey.exportVerificationKey(zkeyFile);

    fs.writeFileSync(vKeyFile, JSON.stringify(vKeyData));
  }

  /**
   * Cleans up all previously generated circuit ASTs.
   */
  public cleanupCircuitASTs(): void {
    fs.rmSync(path.join(this.projectRoot, this.outputDir), { recursive: true, force: true });
  }

  /**
   * Returns JSON file path with a specified filename. If the filename does not have a '.json' extension,
   * it is appended.
   *
   * @param {string} sourcePath - The source path to the circuit file.
   * @param {string} filename - The base name for the JSON file.
   * @returns {string} The full path to the possibly created JSON file.
   */
  private _getFutureASTFilePath(sourcePath: string, filename: string): string {
    const jsonFilename = filename.endsWith(".json") ? filename : `${filename}.json`;

    const filePath = path.join(this.outputDir, sourcePath, jsonFilename);

    return path.resolve(filePath);
  }

  /**
   * Extracts the circuit name from the file path. Used to identify the circuit in the AST.
   *
   * @param {string} filePath - The full path to the circuit file.
   * @returns {string} The extracted name of the circuit.
   */
  private _extractCircuitName(filePath: string): string {
    const baseName = path.basename(filePath);

    return baseName.replace(path.extname(baseName), "");
  }

  /**
   * Extracts the source path from the file path. This is intended to identify the directory path
   * where the AST should be stored.
   *
   * The extracted path is relative to the project root and skips the top-level directory.
   *
   * For example, if the `filePath` is `circuits/utils/utility.circom`, then the resulting file with
   * the AST will be saved with the following tree structure relative to the project root:
   *
   * ```
   * . (PROJECT_ROOT)
   * ├── (TEMP_DIR, default: `cache/circuits-ast`)
   * │   └── utils (circuits directory is skipped)
   * │       └── utility.json
   * ```
   *
   * @param {string} filePath - The full path to the circuit file.
   * @returns {string} The extracted source path.
   */
  private _extractSourcePath(filePath: string): string {
    const pathParts = path
      .resolve(this.projectRoot, filePath)
      .replace(path.resolve(this.defaultDir), "")
      .split(path.sep);

    // Skip the `/` symbol
    pathParts.shift();

    return path.dirname(pathParts.join(path.sep));
  }

  /**
   * Creates a sequence of directories based on the provided source path.
   *
   * @param {string} sourcePath - The source path of the circuit file.
   */
  private _createCircuitASTDirectory(sourcePath: string): void {
    const fullPath = path.join(this.outputDir, sourcePath);

    fs.mkdirSync(fullPath, { recursive: true });
  }

  /**
   * Displays the error message when the circuit generation fails.
   */
  private async _displayCircuitGenerationError(circuitName: string, args: string[]): Promise<void> {
    if (!this.quiet) {
      console.error(`Error generating AST for circuit: ${circuitName}. Reason: \n`);

      try {
        await this._getCircomRunner(args).execute(this._wasmBytes);
      } catch {}
    }
  }

  /**
   * Returns an instance of the CircomRunner with the specified arguments.
   *
   * FIXME: explain error handling
   */
  private _getCircomRunner(args: string[], quiet: boolean = false): any {
    return new CircomRunner({
      args,
      preopens: { "/": "/" },
      bindings: {
        ...bindings,
        exit(_code: number) {},
        fs,
      },
      quiet,
    });
  }
}
