import fs from "fs";
import path from "path";
import ts from "typescript";

import BaseTSGenerator from "./BaseTSGenerator";

import { normalizeName } from "../../utils";

import { CircuitArtifact, Signal, ArtifactWithPath } from "../../types";

import { InternalType, SignalTypeNames, SignalVisibilityNames } from "../../constants";

/**
 * `CircuitTypesGenerator` is need for generating TypeScript interfaces based on circuit artifacts.
 *
 * The class fetches circuit artifacts from a dedicated folder, parses them, and generates TypeScript interfaces.
 * It creates a separate interface file for each circuit and an index file that exports all the interfaces.
 *
 * Note: Currently, all signals are considered as `bigint` type.
 */
export default class CircuitTypesGenerator extends BaseTSGenerator {
  /**
   * Generates TypeScript interfaces based on the circuit artifacts.
   *
   * Based on each circuitArtifact one file with two interfaces is generated:
   * - Public<circuitName> - needed for the verification of the proof
   * - Private<circuitName> - needed for the generation of the proof
   *
   * Also, `index.ts` file is generated that exports all the interfaces.
   *
   * @returns {Promise<void>} A promise that resolves when all interfaces have been generated.
   */
  public async generateTypes(): Promise<void> {
    await this._artifactsGenerator.generateCircuitArtifacts();

    this._generateBaseTypes();

    const circuitArtifacts = this._fetchCircuitArtifacts();

    fs.mkdirSync(this.getOutputTypesDir(), { recursive: true });

    const isNameExist: Map<string, boolean> = new Map();
    const typePathsToResolve: ArtifactWithPath[] = [];

    for (let i = 0; i < circuitArtifacts.length; i++) {
      const circuitName = circuitArtifacts[i].circuitName;

      const isNameAlreadyExist = isNameExist.has(circuitName);
      isNameExist.set(circuitName, true);

      let circuitTypePath = path
        .join(
          BaseTSGenerator.DOMAIN_SEPARATOR,
          circuitArtifacts[i].sourceName.replace(circuitArtifacts[i].basePath, ""),
        )
        .replace(path.basename(circuitArtifacts[i].sourceName), `${circuitName}.ts`);

      if (isNameAlreadyExist) {
        circuitTypePath = path.join(
          BaseTSGenerator.DOMAIN_SEPARATOR,
          circuitArtifacts[i].sourceName.replace(circuitArtifacts[i].basePath, ""),
          `${circuitName}.ts`,
        );
      }

      fs.mkdirSync(path.join(this._projectRoot, this.getOutputTypesDir(), path.dirname(circuitTypePath)), {
        recursive: true,
      });

      const preparedNode = this._returnTSDefinitionByArtifact(circuitArtifacts[i], circuitTypePath);

      this._saveFileContent(circuitTypePath, preparedNode);

      typePathsToResolve.push({
        circuitArtifact: circuitArtifacts[i],
        pathToGeneratedFile: path.join(this.getOutputTypesDir(), circuitTypePath),
      });
    }

    this._resolveTypePaths(typePathsToResolve);
  }

  /**
   * Generates the index files in the `TYPES_DIR` directory and its subdirectories.
   *
   * @param {ArtifactWithPath[]} typePaths - The paths to the generated files and the corresponding circuit artifacts.
   */
  private _resolveTypePaths(typePaths: ArtifactWithPath[]): void {
    const rootTypesDirPath = path.join(this._projectRoot, this.getOutputTypesDir());
    const pathToMainIndexFile = path.join(rootTypesDirPath, "index.ts");

    // index file path => its content
    const indexFilesMap: Map<string, string[]> = new Map();
    const isCircuitNameExist: Map<string, boolean> = new Map();

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

      if (!isCircuitNameExist.has(typePath.circuitArtifact.circuitName)) {
        indexFilesMap.set(pathToMainIndexFile, [
          ...(indexFilesMap.get(pathToMainIndexFile) === undefined ? [] : indexFilesMap.get(pathToMainIndexFile)!),
          this._getExportDeclarationForFile(path.relative(path.join(this._projectRoot), levels.join(path.sep))),
        ]);
      }

      isCircuitNameExist.set(typePath.circuitArtifact.circuitName, true);
    }

    for (const [absolutePath, content] of indexFilesMap) {
      this._saveFileContent(
        path.relative(path.join(this._projectRoot, this.getOutputTypesDir()), absolutePath),
        content.join("\n"),
      );
    }
  }

  /**
   * Generates the export declaration for the given directory which would be included in the index file.
   *
   * Example:
   * ```ts
   * import type * as BasicInAuthCircom from "./BasicInAuth.circom";
   * export type { BasicInAuthCircom };
   * ```
   *
   * @param {string} directory - The directory for which the export declaration is generated.
   * @returns {string} The generated export declaration.
   */
  private _getExportDeclarationForDirectory(directory: string): string {
    const importDeclaration = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        true,
        undefined,
        ts.factory.createNamespaceImport(ts.factory.createIdentifier(normalizeName(directory))),
      ),
      ts.factory.createStringLiteral(`./${directory}`),
    );
    const exportDeclaration = ts.factory.createExportDeclaration(
      undefined,
      true,
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
   * export type * from "./Multiplier2";
   * ```
   *
   * @param {string} file - The file for which the export declaration is generated.
   * @returns {string} The generated export declaration.
   */
  private _getExportDeclarationForFile(file: string): string {
    const exportDeclaration = ts.factory.createExportDeclaration(
      undefined,
      true,
      undefined,
      ts.factory.createStringLiteral(`./${file.replace(path.extname(file), "")}`),
    );

    return this._getNodeContent(exportDeclaration);
  }

  /**
   * Generates TypeScript interface definitions based on the single circuit artifact.
   *
   * The generated interface for the circuit will be stored in the folder of the circuit file name.
   *
   * For example, if the circuit file is named `DEFAULT_DIR/Basic.circom` and the main component is named Multiplier2, then the tree structure will be:
   *
   * ```
   * . (PROJECT_ROOT)
   * ├── (TYPES_DIR, default: `generated-types/circuits`)
   * │   └── Multiplier2.ts
   * ```
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact for which the TypeScript interfaces are generated.
   * @param {string} interfacePathLocation - The path to the interface file.
   * @returns {string} The relative to the TYPES_DIR path to the generated file.
   */
  private _returnTSDefinitionByArtifact(circuitArtifact: CircuitArtifact, interfacePathLocation: string): string {
    const generateProofInterfaceContent = this._getInterfaceForProofGeneration(circuitArtifact);
    const verifyProofInterfaceContent = this._getInterfaceForProofVerification(circuitArtifact);

    return [
      this._getImportTypesDeclarationContent(interfacePathLocation),
      generateProofInterfaceContent,
      verifyProofInterfaceContent,
    ].join("\n\n");
  }

  /**
   * Generates the interface declaration for the Verify Proof parameters.
   */
  private _getInterfaceForProofVerification(circuitArtifact: CircuitArtifact): string {
    const verifyProofInterfaceName = this._getInterfaceName(circuitArtifact, "Public");

    let outputCounter: number = 0;
    const verifyProofInterfaceProperties: ts.PropertySignature[] = [];

    for (const signal of circuitArtifact.signals) {
      if (signal.visibility === SignalVisibilityNames.Private) {
        continue;
      }

      if (signal.type === SignalTypeNames.Output) {
        verifyProofInterfaceProperties.splice(
          outputCounter,
          0,
          ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal)),
        );

        outputCounter++;
        continue;
      }

      verifyProofInterfaceProperties.push(
        ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal)),
      );
    }

    const verifyProofInterface = this._getInterfaceDeclaration(
      verifyProofInterfaceName,
      verifyProofInterfaceProperties,
    );

    return this._getNodeContent(verifyProofInterface);
  }

  /**
   * Generates the interface declaration for the Generate Proof parameters.
   */
  private _getInterfaceForProofGeneration(circuitArtifact: CircuitArtifact): string {
    const generateProofInterfaceName = this._getInterfaceName(circuitArtifact, "Private");

    const generateProofInterfaceProperties = circuitArtifact.signals
      .filter((signal) => signal.type != SignalTypeNames.Output)
      .map((signal) => {
        return ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal));
      });

    const generateProofInterface = this._getInterfaceDeclaration(
      generateProofInterfaceName,
      generateProofInterfaceProperties,
    );

    return this._getNodeContent(generateProofInterface);
  }

  /**
   * Fetches the circuit artifacts from the `ARTIFACTS_DIR` directory.
   *
   * Directories and not JSON files are ignored.
   *
   * @returns {CircuitArtifact[]} The fetched circuit artifacts.
   */
  private _fetchCircuitArtifacts(): CircuitArtifact[] {
    const files = fs.readdirSync(this._artifactsGenerator.getOutputArtifactsDir(), { recursive: true });

    const artifacts: CircuitArtifact[] = [];

    for (const file of files) {
      const filePath = file.toString();

      if (!path.extname(filePath) || !path.extname(filePath).includes(".json")) {
        continue;
      }

      artifacts.push(
        JSON.parse(fs.readFileSync(path.join(this._artifactsGenerator.getOutputArtifactsDir(), filePath), "utf-8")),
      );
    }

    return artifacts;
  }

  /**
   * This function binds internal signal types to TypeScript types.
   *
   * Currently only bigint is supported as mostly within the circuits we are dealing with numbers.
   *
   * @param {Signal} signal - The signal for which the TypeScript type is generated.
   * @returns {ts.TypeNode} The TypeScript type node.
   */
  private _getSignalTypeNode(signal: Signal): ts.TypeNode {
    switch (signal.internalType) {
      case InternalType.BigInt:
        return ts.factory.createTypeReferenceNode(this._defaultFieldName);
      case InternalType.BigIntArray:
        let innerType = ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(this._defaultFieldName));

        for (let i = 0; i < signal.dimensions - 1; i++) {
          innerType = ts.factory.createArrayTypeNode(innerType);
        }

        return innerType;
      default:
        throw new Error(`Unsupported signal type: ${signal.internalType}`);
    }
  }
}
