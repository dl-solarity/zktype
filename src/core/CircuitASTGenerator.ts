import fs from "fs";
import path from "path";

const { CircomRunner, bindings } = require("@distributedlab/circom2");

import { findProjectRoot } from "../utils";

import { CircuitAST } from "../types";

/**
 * `CircuitASTGenerator` serves as an interface to the Circom compiler for the first step in the circuit types generation process.
 * Its primary function is to generate the Abstract Syntax Tree (AST) for a given circuit file.
 *
 * It is designed to work independently of any filtering logic, acting solely as a conduit to the compiler.
 * @todo Consider using a class for filtering which circuits to compile for caching purposes.
 * @todo Add ability to provide options for the Circom compiler (in case if there are plans to extend functionality of ast generation).
 */
export default class CircuitASTGenerator {
  /**
   * Directory to store all generated files during the AST generation process.
   */
  public static readonly TEMP_DIR = "cache/circuits-ast/";

  public readonly projectRoot: string;

  private readonly _wasmBytes: Buffer;

  constructor(private defaultDir: string) {
    this.projectRoot = findProjectRoot(process.cwd());

    const tempDirPath = path.join(this.projectRoot, CircuitASTGenerator.TEMP_DIR);

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
      const circom = new CircomRunner({
        args,
        preopens: { "/": "/" },
        bindings: {
          ...bindings,
          fs,
        },
      });

      await circom.execute(this._wasmBytes);

      const circuitAST: CircuitAST = {
        sourcePath: path.relative(this.projectRoot, filePath),
        circomCompilerOutput: JSON.parse(fs.readFileSync(astFilePath, "utf-8")),
      };

      fs.writeFileSync(astFilePath, JSON.stringify(circuitAST));

      return true;
    } catch (error) {
      console.error(`Error generating AST for circuit: ${circuitName}. Reason: \n${error}`);

      return false;
    }
  }

  /**
   * Cleans up all previously generated circuit ASTs.
   */
  public cleanupCircuitASTs(): void {
    fs.rmSync(path.join(this.projectRoot, CircuitASTGenerator.TEMP_DIR), { recursive: true, force: true });
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

    const filePath = path.join(CircuitASTGenerator.TEMP_DIR, sourcePath, jsonFilename);

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
    const fullPath = path.join(CircuitASTGenerator.TEMP_DIR, sourcePath);

    fs.mkdirSync(fullPath, { recursive: true });
  }
}
