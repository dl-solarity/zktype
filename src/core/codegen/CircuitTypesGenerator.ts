import fs from "fs";
import path from "path";
import ts from "typescript";

import BaseTSGenerator from "./BaseTSGenerator";

import CircuitArtifactGenerator from "../CircuitArtifactGenerator";

import { CircuitArtifact, Signal } from "../../types";
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
    this._generateBaseTypes();

    const circuitArtifacts = this._fetchCircuitArtifacts();

    fs.mkdirSync(CircuitTypesGenerator.TYPES_DIR, { recursive: true });

    let resultedSourceFileContent = "";
    let nodesMap: Map<string, boolean> = new Map();

    for (let i = 0; i < circuitArtifacts.length; i++) {
      const preparedNode = this._returnTSDefinitionByArtifact(circuitArtifacts[i]);

      if (nodesMap.has(preparedNode)) {
        continue;
      }

      this._saveFileContent(circuitArtifacts[i].circuitName, preparedNode);

      nodesMap.set(preparedNode, true);

      const exportDeclaration = ts.factory.createExportDeclaration(
        undefined,
        false,
        undefined,
        ts.factory.createStringLiteral(`./${circuitArtifacts[i].circuitName}`),
      );

      resultedSourceFileContent += this._getNodeContent(exportDeclaration) + "\n";
    }

    fs.writeFileSync(
      path.join(this._projectRoot, CircuitTypesGenerator.TYPES_DIR, "index.ts"),
      resultedSourceFileContent,
    );
  }

  /**
   * Generates TypeScript interface definitions based on the single circuit artifact.
   *
   * This function returns a content of the file with two interfaces.
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact for which the TypeScript interfaces are generated.
   * @returns {string} The content of the file with two interfaces.
   */
  private _returnTSDefinitionByArtifact(circuitArtifact: CircuitArtifact): string {
    const generateProofInterfaceName = this._getInterfaceName(circuitArtifact, "Private");
    const verifyProofInterfaceName = this._getInterfaceName(circuitArtifact, "Public");

    const generateProofInterfaceProperties = circuitArtifact.signals
      .filter((signal) => signal.type != SignalTypeNames.Output)
      .map((signal) => {
        return ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal));
      });
    const verifyProofInterfaceProperties = circuitArtifact.signals
      .filter((signal) => signal.visibility != SignalVisibilityNames.Private)
      .map((signal) => {
        return ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal));
      });

    const generateProofInterface = this._getInterfaceDeclaration(
      generateProofInterfaceName,
      generateProofInterfaceProperties,
    );
    const verifyProofInterface = this._getInterfaceDeclaration(
      verifyProofInterfaceName,
      verifyProofInterfaceProperties,
    );

    const generateProofInterfaceContent = this._getNodeContent(generateProofInterface);
    const verifyProofInterfaceContent = this._getNodeContent(verifyProofInterface);

    return [this._getImportTypesDeclarationContent(), generateProofInterfaceContent, verifyProofInterfaceContent].join(
      "\n\n",
    );
  }

  /**
   * Fetches the circuit artifacts from the `ARTIFACTS_DIR` directory.
   *
   * Directories and not JSON files are ignored.
   *
   * @returns {CircuitArtifact[]} The fetched circuit artifacts.
   */
  private _fetchCircuitArtifacts(): CircuitArtifact[] {
    const files = fs.readdirSync(CircuitArtifactGenerator.ARTIFACTS_DIR, { recursive: true });

    const artifacts: CircuitArtifact[] = [];

    for (const file of files) {
      const filePath = file.toString();

      if (!path.extname(filePath) || !path.extname(filePath).includes(".json")) {
        continue;
      }

      artifacts.push(JSON.parse(fs.readFileSync(path.join(CircuitArtifactGenerator.ARTIFACTS_DIR, filePath), "utf-8")));
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
        return ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(this._defaultFieldName));
      default:
        throw new Error(`Unsupported signal type: ${signal.internalType}`);
    }
  }
}
