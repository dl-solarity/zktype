import fs from "fs";
import path from "path";
import ts from "typescript";

import ZkitTSGenerator from "./ZkitTSGenerator";

import { normalizeName } from "../utils";

import { Formats } from "../constants";
import { CircuitArtifact, GeneratedCircuitWrapperResult, CircuitSet } from "../types";

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
  public async getCircuitObject(circuitName: string, protocol?: string): Promise<any> {
    const pathToGeneratedTypes = this.getOutputTypesDir();

    const module = await import(pathToGeneratedTypes);

    if (protocol) {
      circuitName += this._getPrefix(protocol.toLowerCase());
    }

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
    const circuitSet: CircuitSet = {};

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
      const preparedNodes: GeneratedCircuitWrapperResult[] = await this._returnTSDefinitionByArtifact(
        circuitArtifacts[i],
        pathToGeneratedFile,
      );

      for (const preparedNode of preparedNodes) {
        circuitTypePath = path.join(path.dirname(circuitTypePath), preparedNode.className + ".ts");

        this._saveFileContent(circuitTypePath, preparedNode.content);

        if (!circuitSet[circuitName]) {
          circuitSet[circuitName] = [];
        }

        circuitSet[circuitName].push({
          circuitArtifact: circuitArtifacts[i],
          pathToGeneratedFile: path.join(this.getOutputTypesDir(), circuitTypePath),
          protocol: preparedNode.protocol,
        });
      }
    }

    await this._resolveTypePaths(circuitSet);
    await this._saveMainIndexFile(circuitSet);
    await this._saveHardhatZkitTypeExtensionFile(circuitSet);

    // copy utils to types output dir
    const utilsDirPath = this.getOutputTypesDir();
    fs.mkdirSync(utilsDirPath, { recursive: true });
    fs.copyFileSync(path.join(__dirname, "templates", "utils.ts"), path.join(utilsDirPath, "utils.ts"));
  }

  /**
   * Generates the index files in the subdirectories of the `TYPES_DIR` directory.
   */
  private async _resolveTypePaths(circuitSet: CircuitSet): Promise<void> {
    const rootTypesDirPath = this.getOutputTypesDir();

    // index file path => its content
    const indexFilesMap: Map<string, Set<string>> = new Map();

    for (const [, artifactWithPaths] of Object.entries(circuitSet)) {
      for (const artifactWithPath of artifactWithPaths) {
        const levels: string[] = artifactWithPath.pathToGeneratedFile
          .replace(this.getOutputTypesDir(), "")
          .split(path.sep)
          .filter((level) => level !== "");

        for (let i = 1; i < levels.length; i++) {
          const pathToIndexFile = path.join(rootTypesDirPath, levels.slice(0, i).join(path.sep), "index.ts");

          if (!indexFilesMap.has(pathToIndexFile)) {
            indexFilesMap.set(pathToIndexFile, new Set());
          }

          const exportDeclaration =
            path.extname(levels[i]) === ".ts"
              ? this._getExportDeclarationForFile(levels[i])
              : this._getExportDeclarationForDirectory(levels[i]);

          if (
            indexFilesMap.get(pathToIndexFile) === undefined ||
            !indexFilesMap.get(pathToIndexFile)!.has(exportDeclaration)
          ) {
            indexFilesMap.set(pathToIndexFile, indexFilesMap.get(pathToIndexFile)!.add(exportDeclaration));
          }
        }
      }
    }

    for (const [absolutePath, content] of indexFilesMap) {
      this._saveFileContent(path.relative(this.getOutputTypesDir(), absolutePath), Array.from(content).join("\n"));
    }
  }

  private async _saveMainIndexFile(circuitSet: CircuitSet): Promise<void> {
    let mainIndexFileContent = this._getExportDeclarationForDirectory(CircuitTypesGenerator.DOMAIN_SEPARATOR) + "\n";

    for (const [, artifactWithPaths] of Object.entries(circuitSet)) {
      let isCircuitNameOverlaps = false;
      const seenProtocols: string[] = [];

      for (const artifactWithPath of artifactWithPaths) {
        if (seenProtocols.includes(artifactWithPath.protocol)) {
          isCircuitNameOverlaps = true;
          break;
        }

        seenProtocols.push(artifactWithPath.protocol);
      }

      if (isCircuitNameOverlaps) {
        continue;
      }

      for (const artifactWithPath of artifactWithPaths) {
        const levels: string[] = artifactWithPath.pathToGeneratedFile
          .replace(this.getOutputTypesDir(), "")
          .split(path.sep)
          .filter((level) => level !== "");

        const exportPathToCircuitType = this._getExportDeclarationForFile(
          path.relative(this._projectRoot, levels.join(path.sep)),
        );

        mainIndexFileContent += exportPathToCircuitType + "\n";
      }
    }

    this._saveFileContent("index.ts", mainIndexFileContent);
  }

  private async _saveHardhatZkitTypeExtensionFile(circuitSet: CircuitSet): Promise<void> {
    this._saveFileContent("hardhat.d.ts", await this._genHardhatZkitTypeExtension(circuitSet));
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
  ): Promise<GeneratedCircuitWrapperResult[]> {
    switch (circuitArtifact._format) {
      case Formats.V1HH_ZKIT_TYPE:
        return await this._genCircuitWrappersClassContent(circuitArtifact, pathToGeneratedFile);
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
      const filePath = file.artifactPath.toString();

      if (!path.extname(filePath) || !path.extname(filePath).includes(".json")) {
        continue;
      }

      const artifactStructure: CircuitArtifact = JSON.parse(
        fs.readFileSync(path.join(this._projectRoot, filePath), "utf-8"),
      );
      artifactStructure.baseCircuitInfo.protocol = file.circuitProtocolType;

      artifacts.push(artifactStructure);
    }

    return artifacts;
  }
}
