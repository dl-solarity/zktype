import fs from "fs";
import path from "path";
import ts from "typescript";

import CircuitArtifactGenerator from "./CircuitArtifactGenerator";

import { findProjectRoot } from "./utils";

import { CircuitArtifact, Signal } from "./types/circuitArtifact";

/**
 * `CircuitTypesGenerator` is need for generating TypeScript interfaces based on circuit artifacts.
 *
 * The class fetches circuit artifacts from a dedicated folder, parses them, and generates TypeScript interfaces.
 * It creates a separate interface file for each circuit and an index file that exports all the interfaces.
 *
 * Note: Currently, all signals are considered as `bigint` type.
 */
export default class CircuitTypesGenerator {
  /**
   * Directory to store all generated types files.
   */
  public static readonly TYPES_DIR: string = "generated-types/circuits";

  private readonly _projectRoot: string;

  constructor() {
    this._projectRoot = findProjectRoot(__dirname);
  }

  /**
   * Generates TypeScript interfaces based on the circuit artifacts.
   *
   * The generated interfaces are stored in separate files for each circuit, and an index
   * file is created to export all the interfaces.
   */
  public async generateTypes(): Promise<void> {
    const circuitArtifacts = this._fetchCircuitArtifacts();

    fs.mkdirSync(CircuitTypesGenerator.TYPES_DIR, { recursive: true });

    fs.writeFileSync(
      path.join(this._projectRoot, CircuitTypesGenerator.TYPES_DIR, "index.ts"),
      this._getIndexSourceFileContent(circuitArtifacts),
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
   * Generates the source file content for the index file and creates separate files with TS interface for each circuit.
   *
   * The index file exports all the generated circuit interfaces.
   *
   * @param {CircuitArtifact[]} circuitArtifacts - The circuit artifacts for which the source file content is generated.
   * @returns {string} The generated source index file content.
   */
  private _getIndexSourceFileContent(circuitArtifacts: CircuitArtifact[]): string {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

    const nodes = circuitArtifacts.map((circuitArtifact) => {
      return this._getInterfaceDeclaration(circuitArtifact);
    });

    let resultedSourceFileContent = "";
    let nodesMap: Map<string, boolean> = new Map();

    for (let i = 0; i < nodes.length; i++) {
      const preparedNode = printer.printNode(ts.EmitHint.Unspecified, nodes[i], resultFile);

      if (nodesMap.has(preparedNode)) {
        continue;
      }

      const exportDeclaration = ts.factory.createExportDeclaration(
        undefined,
        false,
        undefined,
        ts.factory.createStringLiteral(`./${nodes[i].name.text}`),
      );

      resultedSourceFileContent += printer.printNode(ts.EmitHint.Unspecified, exportDeclaration, resultFile) + "\n";

      fs.writeFileSync(
        path.join(this._projectRoot, CircuitTypesGenerator.TYPES_DIR, `${nodes[i].name.escapedText}.ts`),
        preparedNode,
      );

      nodesMap.set(preparedNode, true);
    }

    return resultedSourceFileContent;
  }

  /**
   * Generates the interface declaration for the circuit artifact.
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact for which the interface is generated.
   * @returns {ts.InterfaceDeclaration} The generated interface declaration.
   */
  private _getInterfaceDeclaration(circuitArtifact: CircuitArtifact): ts.InterfaceDeclaration {
    return ts.factory.createInterfaceDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      this._getInterfaceName(circuitArtifact),
      undefined,
      undefined,
      this._getPropertySignatures(circuitArtifact),
    );
  }

  /**
   * Extracts the property signatures from the circuit artifact.
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact from which the property signatures are extracted.
   * @returns {ts.PropertySignature[]} The extracted property signatures.
   */
  private _getPropertySignatures(circuitArtifact: CircuitArtifact): ts.PropertySignature[] {
    return circuitArtifact.signals.map((signal) => {
      return ts.factory.createPropertySignature(undefined, signal.name, undefined, this._getSignalTypeNode(signal));
    });
  }

  /**
   * Extracts the interface name from the circuit artifact.
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact from which the interface name is extracted.
   * @returns {string} The extracted interface name.
   */
  private _getInterfaceName(circuitArtifact: CircuitArtifact): string {
    return `${circuitArtifact.circuitName.replace(path.extname(circuitArtifact.circuitName), "")}`;
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
      case "bigint":
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword);
      default:
        throw new Error(`Unsupported signal type: ${signal.internalType}`);
    }
  }
}
