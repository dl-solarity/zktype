import fs from "fs";
import path from "path";
import ts from "typescript";

import ZkitTSGenerator from "./ZkitTSGenerator";

import { normalizeName } from "../utils";

import { Formats } from "../constants";
import { CircuitArtifact, ArtifactWithPath } from "../types";

/**
 * `CircuitTypesGenerator` is need for generating TypeScript bindings based on circuit artifacts.
 *
 * The class fetches circuit artifacts from a dedicated folder, parses them, and generates TypeScript bindings.
 * It creates a separate types file for each circuit and an index file that exports all the types.
 *
 * Note: Currently, all signals are considered as `bigint` type.
 */
export class CircuitTypesGenerator extends ZkitTSGenerator {
  /**
   * Returns an object that represents the circuit class based on the circuit name.
   */
  public async getCircuitObject(circuitName: string): Promise<any> {
    const pathToGeneratedTypes = this.getOutputTypesDir();

    const module = await import(pathToGeneratedTypes);

    if (!this._isFullyQualifiedCircuitName(circuitName)) {
      if (!module[circuitName]) {
        throw new Error(`Circuit ${circuitName} type does not exist.`);
      }

      return module[circuitName];
    }

    const parts = circuitName.split(":");
    const pathsToModule = this._getPathToGeneratedFile(this._zktypeConfig.basePath, parts[0], parts[1]);

    return this._getObjectFromModule(module, this._getObjectPath(pathsToModule));
  }

  private _getObjectFromModule(module: any, path: string): any {
    return path.split(".").reduce((acc, key) => acc[key], module as any);
  }

  /**
   * Generates TypeScript bindings based on the circuit artifacts.
   *
   * Based on each circuitArtifact one file with two types is generated:
   * - Public<circuitName> - needed for the verification of the proof
   * - Private<circuitName> - needed for the generation of the proof
   *
   * Also, `index.ts` file is generated that exports all the types.
   *
   * @returns {Promise<void>} A promise that resolves when all types have been generated.
   */
  public async generateTypes(): Promise<void> {
    const circuitArtifacts = this._fetchCircuitArtifacts();

    fs.mkdirSync(this.getOutputTypesDir(), { recursive: true });

    const isNameExist: Map<string, boolean> = new Map();
    const typePathsToResolve: ArtifactWithPath[] = [];

    for (let i = 0; i < circuitArtifacts.length; i++) {
      const circuitName = circuitArtifacts[i].circuitTemplateName;

      const isNameAlreadyExist = isNameExist.has(circuitName);
      isNameExist.set(circuitName, true);

      let circuitTypePath = this._getCircuitTypeShortPath(
        this._zktypeConfig.basePath,
        circuitArtifacts[i].circuitSourceName,
        circuitName,
      );

      if (isNameAlreadyExist) {
        circuitTypePath = this._getCircuitTypeLongPath(
          this._zktypeConfig.basePath,
          circuitArtifacts[i].circuitSourceName,
          circuitName,
        );
      }

      fs.mkdirSync(path.join(this.getOutputTypesDir(), path.dirname(circuitTypePath)), {
        recursive: true,
      });

      const pathToGeneratedFile = path.join(this.getOutputTypesDir(), circuitTypePath);
      const preparedNode = await this._returnTSDefinitionByArtifact(circuitArtifacts[i], pathToGeneratedFile);

      this._saveFileContent(circuitTypePath, preparedNode);

      typePathsToResolve.push({
        circuitArtifact: circuitArtifacts[i],
        pathToGeneratedFile: path.join(this.getOutputTypesDir(), circuitTypePath),
      });
    }

    await this._resolveTypePaths(typePathsToResolve);

    // copy utils to types output dir
    const utilsDirPath = this.getOutputTypesDir();
    fs.mkdirSync(utilsDirPath, { recursive: true });
    fs.copyFileSync(path.join(__dirname, "templates", "utils.ts"), path.join(utilsDirPath, "utils.ts"));
  }

  /**
   * Generates the index files in the `TYPES_DIR` directory and its subdirectories.
   *
   * @param {ArtifactWithPath[]} typePaths - The paths to the generated files and the corresponding circuit artifacts.
   */
  private async _resolveTypePaths(typePaths: ArtifactWithPath[]): Promise<void> {
    const rootTypesDirPath = this.getOutputTypesDir();
    const pathToMainIndexFile = path.join(rootTypesDirPath, "index.ts");

    // index file path => its content
    const indexFilesMap: Map<string, string[]> = new Map();
    const isCircuitNameExist: Map<string, boolean> = new Map();

    const topLevelCircuits: {
      [circuitName: string]: ArtifactWithPath[];
    } = {};

    for (const typePath of typePaths) {
      const levels: string[] = typePath.pathToGeneratedFile
        .replace(this.getOutputTypesDir(), "")
        .split(path.sep)
        .filter((level) => level !== "");

      for (let i = 0; i < levels.length; i++) {
        const pathToIndexFile =
          i === 0
            ? path.join(rootTypesDirPath, "index.ts")
            : path.join(rootTypesDirPath, levels.slice(0, i).join(path.sep), "index.ts");

        const exportDeclaration =
          path.extname(levels[i]) === ".ts"
            ? this._getExportDeclarationForFile(levels[i])
            : this._getExportDeclarationForDirectory(levels[i]);

        if (
          indexFilesMap.get(pathToIndexFile) === undefined ||
          !indexFilesMap.get(pathToIndexFile)?.includes(exportDeclaration)
        ) {
          indexFilesMap.set(pathToIndexFile, [
            ...(indexFilesMap.get(pathToIndexFile) === undefined ? [] : indexFilesMap.get(pathToIndexFile)!),
            exportDeclaration,
          ]);
        }
      }

      if (!isCircuitNameExist.has(typePath.circuitArtifact.circuitTemplateName)) {
        indexFilesMap.set(pathToMainIndexFile, [
          ...(indexFilesMap.get(pathToMainIndexFile) === undefined ? [] : indexFilesMap.get(pathToMainIndexFile)!),
          this._getExportDeclarationForFile(path.relative(this._projectRoot, levels.join(path.sep))),
        ]);
      }

      isCircuitNameExist.set(typePath.circuitArtifact.circuitTemplateName, true);

      topLevelCircuits[typePath.circuitArtifact.circuitTemplateName] =
        topLevelCircuits[typePath.circuitArtifact.circuitTemplateName] === undefined
          ? [typePath]
          : [...topLevelCircuits[typePath.circuitArtifact.circuitTemplateName], typePath];
    }

    for (const [absolutePath, content] of indexFilesMap) {
      this._saveFileContent(path.relative(this.getOutputTypesDir(), absolutePath), content.join("\n"));
    }

    const pathToTypesExtensionFile = path.join(rootTypesDirPath, "hardhat.d.ts");

    this._saveFileContent(
      path.relative(this.getOutputTypesDir(), pathToTypesExtensionFile),
      await this._genHardhatZkitTypeExtension(topLevelCircuits),
    );
  }

  /**
   * Generates the export declaration for the given directory which would be included in the index file.
   *
   * Example:
   * ```ts
   * import * as BasicInAuthCircom from "./BasicInAuth.circom";
   * export { BasicInAuthCircom };
   * ```
   *
   * @param {string} directory - The directory for which the export declaration is generated.
   * @returns {string} The generated export declaration.
   */
  private _getExportDeclarationForDirectory(directory: string): string {
    const importDeclaration = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamespaceImport(ts.factory.createIdentifier(normalizeName(directory))),
      ),
      ts.factory.createStringLiteral(`./${directory}`),
    );
    const exportDeclaration = ts.factory.createExportDeclaration(
      undefined,
      false,
      ts.factory.createNamedExports([
        ts.factory.createExportSpecifier(false, undefined, ts.factory.createIdentifier(normalizeName(directory))),
      ]),
    );

    return this._getNodeContent(importDeclaration) + "\n" + this._getNodeContent(exportDeclaration);
  }

  /**
   * Generates the export declaration for the given file which would be included in the index file.
   *
   * Example:
   * ```ts
   * export * from "./Multiplier2";
   * ```
   *
   * @param {string} file - The file for which the export declaration is generated.
   * @returns {string} The generated export declaration.
   */
  private _getExportDeclarationForFile(file: string): string {
    const exportDeclaration = ts.factory.createExportDeclaration(
      undefined,
      false,
      undefined,
      ts.factory.createStringLiteral(`./${file.replace(path.extname(file), "")}`),
    );

    return this._getNodeContent(exportDeclaration);
  }

  /**
   * Generates zkit wrapper class based on the single circuit artifact.
   *
   * The generated class for the circuit will be stored in the folder of the circuit file name in case of circuit names collisions.
   *
   * For example, if the circuit file is named `DEFAULT_DIR/Basic.circom` and the main component is named Multiplier2, then the tree structure will be:
   *
   * ```
   * . (PROJECT_ROOT)
   * ├── (TYPES_DIR, default: `generated-types/circuits`)
   * │   └── Multiplier2.ts
   * ```
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact for which the TypeScript bindings are generated.
   * @param pathToGeneratedFile - The path to the generated file.
   * @returns {string} The relative to the TYPES_DIR path to the generated file.
   */
  private async _returnTSDefinitionByArtifact(
    circuitArtifact: CircuitArtifact,
    pathToGeneratedFile: string,
  ): Promise<string> {
    switch (circuitArtifact._format) {
      case Formats.V1HH_ZKIT_TYPE:
        return await this._genCircuitWrapperClassContent(circuitArtifact, pathToGeneratedFile);
      default:
        throw new Error(`Unsupported format: ${circuitArtifact._format}`);
    }
  }

  /**
   * Fetches the circuit artifacts from the specified paths.
   *
   * Directories and not JSON files are ignored.
   *
   * @returns {CircuitArtifact[]} The fetched circuit artifacts.
   */
  private _fetchCircuitArtifacts(): CircuitArtifact[] {
    const artifacts: CircuitArtifact[] = [];

    for (const file of this._zktypeConfig.circuitsArtifactsPaths) {
      const filePath = file.toString();

      if (!path.extname(filePath) || !path.extname(filePath).includes(".json")) {
        continue;
      }

      artifacts.push(JSON.parse(fs.readFileSync(path.join(this._projectRoot, filePath), "utf-8")));
    }

    return artifacts;
  }
}
