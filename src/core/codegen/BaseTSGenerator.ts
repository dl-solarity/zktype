import fs from "fs";
import path from "path";
import ts from "typescript";

import CircuitArtifactGenerator from "../CircuitArtifactGenerator";

import { CircuitArtifact, ZKTypeConfig } from "../../types";

import { findProjectRoot } from "../../utils";

/**
 * `BaseTSGenerator` is a base class for all TypeScript generators.
 *
 * It exposes common properties and methods that are shared among all TypeScript generators.
 */
export default class BaseTSGenerator {
  /**
   * This separator is needed to distinguish between generated interfaces and auxiliary generated files.
   */
  public static readonly DOMAIN_SEPARATOR: string = "core";

  protected readonly _zktypeConfig: ZKTypeConfig;

  protected readonly _projectRoot: string;

  protected readonly _printer: ts.Printer;
  protected readonly _resultFile: ts.SourceFile;

  protected readonly _artifactsGenerator: CircuitArtifactGenerator;

  constructor(config: ZKTypeConfig) {
    this._zktypeConfig = config;

    this._artifactsGenerator = new CircuitArtifactGenerator(config);

    this._projectRoot = findProjectRoot(process.cwd());

    this._printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    this._resultFile = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  }

  public getOutputTypesDir(): string {
    return this._zktypeConfig.outputTypesDir ?? "generated-types/circuits";
  }

  public getOutputArtifactsDir(): string {
    return this._artifactsGenerator.getOutputArtifactsDir();
  }

  /**
   * Saves the content to the file with the given name.
   *
   * @param {string} typePath - The path to the file to be saved.
   * @param {string} content - The content to be saved.
   */
  protected _saveFileContent(typePath: string, content: string): void {
    if (!fs.existsSync(path.join(this._projectRoot, this.getOutputTypesDir(), path.dirname(typePath)))) {
      fs.mkdirSync(path.join(this._projectRoot, this.getOutputTypesDir(), path.dirname(typePath)), {
        recursive: true,
      });
    }

    fs.writeFileSync(
      path.join(this._projectRoot, this.getOutputTypesDir(), typePath),
      [this._getPreamble(), content].join("\n\n"),
    );
  }

  /**
   * Generates the interface declaration for given name and properties.
   *
   * @param {string} name - The name of the interface.
   * @param {ts.PropertySignature[]} properties - The properties of the interface.
   * @returns {ts.InterfaceDeclaration} The generated interface declaration.
   */
  protected _getInterfaceDeclaration(name: string, properties: ts.PropertySignature[]): ts.InterfaceDeclaration {
    return ts.factory.createInterfaceDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      name,
      undefined,
      undefined,
      properties,
    );
  }

  /**
   * Returns the source file content for the given node.
   *
   * @param {ts.Node} node - The node for which the source file content is generated.
   * @returns {string} The generated source file content.
   */
  protected _getNodeContent(node: ts.Node): string {
    return this._printer.printNode(ts.EmitHint.Unspecified, node, this._resultFile);
  }

  /**
   * Extracts the interface name from the circuit artifact.
   *
   * @param {CircuitArtifact} circuitArtifact - The circuit artifact from which the interface name is extracted.
   * @param {string} [prefix=""] - The prefix to be added to the interface name.
   * @returns {string} The extracted interface name.
   */
  protected _getInterfaceName(circuitArtifact: CircuitArtifact, prefix: string = ""): string {
    return `${prefix}${circuitArtifact.circuitName.replace(path.extname(circuitArtifact.circuitName), "")}`;
  }

  /**
   * Returns the preamble for the generated file.
   */
  protected _getPreamble(): string {
    const preambleNodes = [
      "/* Autogenerated file. Do not edit manually. */",
      "// @ts-nocheck",
      "/* tslint:disable */",
      "/* eslint-disable */",
    ];

    return preambleNodes.join("\n");
  }
}
