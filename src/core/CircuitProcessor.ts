import fs from "fs";
import path from "path";

import CircuitASTGenerator from "./CircuitASTGenerator";

import { findProjectRoot } from "../utils";
import { CircuitProcessorConfig } from "../types";

/**
 * `CircuitProcessor` is responsible for processing circuits by generating their Abstract Syntax Trees (ASTs) using the `CircuitASTGenerator`.
 * It provides a mechanism for filtering which circuits to process based on the configuration provided.
 *
 * Filtering is based on the RegExp matching of file paths against the `only` and `skip` patterns.
 */
export default class CircuitProcessor {
  public readonly supportedFileExtensions = [".circom"];

  private readonly _circuitProcessorConfig: CircuitProcessorConfig;

  private readonly _onlyFilterGlobs: RegExp[];
  private readonly _skipFilterGlobs: RegExp[];

  private readonly _circuitASTGenerator: CircuitASTGenerator;

  private readonly _projectRoot: string = findProjectRoot(process.cwd());

  /**
   * Initializes a new instance of the CircuitProcessor class with optional custom configuration.
   * It sets up filters using RegExp based on the configuration for which files to process or skip.
   *
   * @param {CircuitProcessorConfig} [circuitProcessorConfig=defaultCircuitProcessorConfig] - The configuration object for
   * the circuit processor, including definitions for the default folder, and patterns for files to include or skip.
   */
  constructor(circuitProcessorConfig: CircuitProcessorConfig) {
    this._circuitProcessorConfig = circuitProcessorConfig;

    this._onlyFilterGlobs = this._circuitProcessorConfig.only.map((file) => new RegExp(file));
    this._skipFilterGlobs = this._circuitProcessorConfig.skip.map((file) => new RegExp(file));

    this._circuitASTGenerator = new CircuitASTGenerator(this._circuitProcessorConfig.defaultFolder);
  }

  /**
   * Processes all circuits within the default folder by generating their ASTs using the CircuitASTGenerator.
   * It performs a health check of the default folder before proceeding with the file processing.
   *
   * If the `clean` option is set to `true`, the method will clean up the previously generated circuit ASTs before processing the circuits.
   * If during the circuit processing an error occurs and the `strict` option is set to `true`, the method will throw an error.
   *
   * @returns {Promise<void>} A promise that resolves when all circuits have been processed, or immediately if the default folder is not "healthy".
   */
  public async processCircuits(): Promise<void> {
    if (!this._defaultFolderHeathCheck()) {
      return;
    }

    if (this._circuitProcessorConfig.clean) {
      this._circuitASTGenerator.cleanupCircuitASTs();
    }

    const circuitFiles = this._fetchCircuitFiles();

    for (const circuitFile of circuitFiles) {
      const isSuccess = await this._circuitASTGenerator.generateCircuitAST(
        path.resolve(this._circuitProcessorConfig.defaultFolder, circuitFile),
      );

      if (!isSuccess && this._circuitProcessorConfig.strict) {
        throw new Error(`An error occurred while processing the circuit: ${circuitFile}`);
      }
    }
  }

  /**
   * Retrieves the relative to the project root default folder path specified in the configuration.
   *
   * @returns {string} The path to the default folder.
   */
  public getDefaultFolder(): string {
    return path.relative(this._projectRoot, this._circuitProcessorConfig.defaultFolder);
  }

  /**
   * Validates the health of the default folder by checking its existence and ensuring it's not empty.
   * If the folder doesn't exist, an error is thrown. If the folder is empty, a warning message is logged.
   *
   * @returns {boolean} True if the default folder is valid and not empty, otherwise false.
   */
  private _defaultFolderHeathCheck(): boolean {
    if (!fs.existsSync(this._circuitProcessorConfig.defaultFolder)) {
      throw new Error(`The specified default folder does not exist: ${this._circuitProcessorConfig.defaultFolder}`);
    }

    if (fs.readdirSync(this._circuitProcessorConfig.defaultFolder).length === 0) {
      console.log(`The specified default folder is empty: ${this._circuitProcessorConfig.defaultFolder}`);

      return false;
    }

    return true;
  }

  /**
   * Fetches the list of circuit files from the default folder that meet the criteria specified in the configuration.
   * It filters out files based on the `skip` and `only` configurations and checks if a file contains the main component.
   * The 'skip' option has higher priority than the 'only' option.
   * Files not matching the criteria are excluded from processing.
   *
   * Currently, only files with the `.circom` extension are considered for processing.
   *
   * @returns {string[]} An array of file paths that are eligible for processing based on the provided configurations.
   */
  private _fetchCircuitFiles(): string[] {
    const files = fs.readdirSync(this._circuitProcessorConfig.defaultFolder, { recursive: true });

    const circuitFiles: string[] = [];

    for (const file of files) {
      const stringRepresentation = file.toString();

      if (
        !path.extname(stringRepresentation) ||
        !this.supportedFileExtensions.includes(path.extname(stringRepresentation))
      ) {
        continue;
      }

      if (this._isFilePathInSkipOption(stringRepresentation)) {
        continue;
      }

      if (this._circuitProcessorConfig.only.length > 0 && !this._isFilePathInOnlyOption(stringRepresentation)) {
        continue;
      }

      if (!this._isCircuitContainsMain(stringRepresentation)) {
        continue;
      }

      circuitFiles.push(stringRepresentation);
    }

    return circuitFiles;
  }

  /**
   * Checks if a given file path matches any of the patterns specified in the `only` configuration.
   * This determines whether the file is among those that should be exclusively processed.
   *
   * @param {string} filePath - The path of the file to check against the `only` patterns.
   * @returns {boolean} True if the file matches an `only` pattern, otherwise false.
   */
  private _isFilePathInOnlyOption(filePath: string): boolean {
    for (const glob of this._onlyFilterGlobs) {
      if (glob.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a given file path matches any of the patterns specified in the `skip` configuration.
   * This determines whether the file is among those that should be skipped during processing.
   *
   * @param {string} filePath - The path of the file to check against the `skip` patterns.
   * @returns {boolean} True if the file matches a `skip` pattern, otherwise false.
   */
  private _isFilePathInSkipOption(filePath: string): boolean {
    for (const glob of this._skipFilterGlobs) {
      if (glob.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifies if a file contains the main component, which is a criterion for processing.
   * This method reads the file's content to search for a specific pattern indicating the presence of the main component.
   *
   * @param {string} filePath - The path of the file to check for the main component.
   * @returns {boolean} True if the file contains the main component, otherwise false.
   */
  private _isCircuitContainsMain(filePath: string): boolean {
    const fileContent = fs.readFileSync(path.resolve(this._circuitProcessorConfig.defaultFolder, filePath), "utf8");

    const regex = /component +main/;

    return regex.test(fileContent);
  }
}
