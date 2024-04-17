import fs from "fs";
import path from "path";
import ts from "typescript";

import { findProjectRoot } from "../../utils";

import { CircuitArtifact } from "../../types";

/**
 * `BaseTSGenerator` is a base class for all TypeScript generators.
 *
 * It exposes common properties and methods that are shared among all TypeScript generators.
 */
export default class BaseTSGenerator {
  /**
   * Directory to store all generated types files.
   */
  public static readonly TYPES_DIR: string = "generated-types/circuits";

  protected readonly _defaultFieldName: string = "BigNumberish";

  protected readonly _projectRoot: string;

  protected readonly _printer: ts.Printer;
  protected readonly _resultFile: ts.SourceFile;

  constructor() {
    this._projectRoot = findProjectRoot(process.cwd());

    this._printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    this._resultFile = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  }

  /**
   * This function generates `types.ts` file with common types used in the generated interfaces.
   *
   * @returns {void}
   */
  protected _generateBaseTypes(): void {
    const bigIntType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword);
    const stringType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);

    const bigNumberishType = ts.factory.createTypeAliasDeclaration(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(this._defaultFieldName),
      undefined,
      ts.factory.createUnionTypeNode([bigIntType, stringType]),
    );

    this._saveFileContent("types", this._getNodeContent(bigNumberishType));
  }

  /**
   * Saves the content to the file with the given name.
   *
   * @param {string} filename - The name of the file to which the content is saved.
   * @param {string} content - The content to be saved.
   */
  protected _saveFileContent(filename: string, content: string): void {
    if (!fs.existsSync(path.join(this._projectRoot, BaseTSGenerator.TYPES_DIR))) {
      fs.mkdirSync(path.join(this._projectRoot, BaseTSGenerator.TYPES_DIR), { recursive: true });
    }

    fs.writeFileSync(path.join(this._projectRoot, BaseTSGenerator.TYPES_DIR, `${filename}.ts`), content);
  }

  /**
   * Generates the import types declaration content.
   *
   * Generates: `import type { BigNumberish } from "./types";`
   *
   * @returns {string} The generated import types declaration content.
   */
  protected _getImportTypesDeclarationContent(): string {
    return this._getNodeContent(
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          true,
          undefined,
          ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(this._defaultFieldName)),
          ]),
        ),
        ts.factory.createStringLiteral("./types"),
      ),
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
}
