import ts from "typescript";

import BaseTSGenerator from "./BaseTSGenerator";

import { CircuitArtifact } from "../../types";
import { SignalTypeNames, SignalVisibilityNames } from "../../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  public readonly ZKIT_LIB_NAME: string = "@solarity/zkit";

  private readonly _numberLikeTypeName: string = "NumberLike";
  private readonly _publicSignalsTypeName: string = "PublicSignals";
  private readonly _numericStringTypeName: string = "NumericString";

  private readonly _proofTypeName: string = "Groth16Proof";
  private readonly _calldataTypeName: string = "Calldata";
  private readonly _circuitZKitClassName: string = "CircuitZKit";
  private readonly _circuitZKitConfigInterfaceName: string = "CircuitZKitConfig";

  private readonly _signalNamesMethodName: string = "_getSignalNames";

  protected _getProofTypeNode(): ts.TypeNode {
    return ts.factory.createTypeReferenceNode(this._proofTypeName);
  }

  protected _getPrivateInputType(): ts.Identifier {
    return ts.factory.createIdentifier("NumberLike");
  }

  protected _getPublicInputType(): ts.Identifier {
    return ts.factory.createIdentifier("NumericString");
  }

  /**
   * Generates the import types declaration content of zkit library.
   *
   * Generates: `import type { Groth16Proof, ... } from "<ZKIT_LIB_NAME>";`
   *
   * @returns {string} The generated import types declaration content.
   */
  protected _getZkitImportTypesDeclarationContent(): string {
    return this._getNodeContent(
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(this._numberLikeTypeName)),
            ts.factory.createImportSpecifier(
              false,
              undefined,
              ts.factory.createIdentifier(this._publicSignalsTypeName),
            ),
            ts.factory.createImportSpecifier(
              false,
              undefined,
              ts.factory.createIdentifier(this._numericStringTypeName),
            ),
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(this._calldataTypeName)),
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(this._circuitZKitClassName)),
            ts.factory.createImportSpecifier(
              false,
              undefined,
              ts.factory.createIdentifier(this._circuitZKitConfigInterfaceName),
            ),
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(this._proofTypeName)),
          ]),
        ),
        ts.factory.createStringLiteral(this.ZKIT_LIB_NAME),
      ),
    );
  }

  protected _genCircuitWrapperClassContent(circuitArtifact: CircuitArtifact): string {
    const className = `${circuitArtifact.circuitName}Circuit`;

    const classDeclaration = ts.factory.createClassDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword), ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)],
      ts.factory.createIdentifier(className),
      undefined,
      [
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          ts.factory.createExpressionWithTypeArguments(
            ts.factory.createIdentifier(this._circuitZKitClassName),
            undefined,
          ),
        ]),
      ],
      [
        this._genConstructorDeclaration(),
        this._genGenerateProofMethodDeclaration(circuitArtifact),
        this._genVerifyProofMethodDeclaration(circuitArtifact),
        this._genGenerateCalldataMethodDeclaration(circuitArtifact),
        this.createNormalizePublicSignalsMethod(),
        this.createDenormalizePublicSignalsMethod(),
        this.createGetSignalNamesMethod(circuitArtifact),
      ],
    );

    return this._getNodeContent(classDeclaration);
  }

  private _genConstructorDeclaration(): ts.ConstructorDeclaration {
    const zkitConfigIdentifier = ts.factory.createIdentifier("config");

    return ts.factory.createConstructorDeclaration(
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          zkitConfigIdentifier,
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(this._circuitZKitConfigInterfaceName),
            undefined,
          ),
          undefined,
        ),
      ],
      ts.factory.createBlock(
        [
          ts.factory.createExpressionStatement(
            ts.factory.createCallExpression(ts.factory.createSuper(), undefined, [zkitConfigIdentifier]),
          ),
        ],
        true,
      ),
    );
  }

  private _genGenerateProofMethodDeclaration(circuitArtifact: CircuitArtifact): ts.MethodDeclaration {
    const methodIdentifier = ts.factory.createIdentifier("generateProof");
    const inputIdentifier = ts.factory.createIdentifier("inputs");
    const inputType = ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(this._getInterfaceName(circuitArtifact, "Private")),
      undefined,
    );
    const returnIdentifier = ts.factory.createIdentifier(this._getInterfaceName(circuitArtifact, "Proof"));
    const transformSignalIdentifier = ts.factory.createIdentifier("_normalizePublicSignals");

    const vars = ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier("proof"),
            undefined,
            undefined,
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createSuper(),
                  ts.factory.createIdentifier("generateProof"),
                ),
                undefined,
                [ts.factory.createIdentifier("inputs as any")],
              ),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );

    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PublicKeyword), ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      methodIdentifier,
      undefined,
      undefined,
      [ts.factory.createParameterDeclaration(undefined, undefined, inputIdentifier, undefined, inputType, undefined)],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Promise"), [
        ts.factory.createTypeReferenceNode(returnIdentifier, undefined),
      ]),
      ts.factory.createBlock(
        [
          vars,
          ts.factory.createReturnStatement(
            ts.factory.createObjectLiteralExpression(
              [
                ts.factory.createPropertyAssignment(
                  ts.factory.createIdentifier("proof"),
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier("proof"),
                    ts.factory.createIdentifier("proof"),
                  ),
                ),
                ts.factory.createPropertyAssignment(
                  ts.factory.createIdentifier("publicSignals"),
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(ts.factory.createThis(), transformSignalIdentifier),
                    undefined,
                    [
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier("proof"),
                        ts.factory.createIdentifier("publicSignals"),
                      ),
                    ],
                  ),
                ),
              ],
              true,
            ),
          ),
        ],
        true,
      ),
    );
  }

  private _genVerifyProofMethodDeclaration(circuitArtifact: CircuitArtifact): ts.MethodDeclaration {
    const methodIdentifier = ts.factory.createIdentifier("verifyProof");
    const inputIdentifier = ts.factory.createIdentifier("proof");
    const inputType = ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(this._getInterfaceName(circuitArtifact, "Proof")),
      undefined,
    );
    const returnIdentifier = ts.factory.createIdentifier("boolean");
    const transformSignalIdentifier = ts.factory.createIdentifier("_denormalizePublicSignals");

    return this._genGenerateGenericMethodDeclaration(
      methodIdentifier,
      inputIdentifier,
      inputType,
      returnIdentifier,
      transformSignalIdentifier,
    );
  }

  private _genGenerateCalldataMethodDeclaration(circuitArtifact: CircuitArtifact): ts.MethodDeclaration {
    const methodIdentifier = ts.factory.createIdentifier("generateCalldata");
    const inputIdentifier = ts.factory.createIdentifier("proof");
    const inputType = ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(this._getInterfaceName(circuitArtifact, "Proof")),
      undefined,
    );
    const returnIdentifier = ts.factory.createIdentifier("Calldata");
    const transformSignalIdentifier = ts.factory.createIdentifier("_denormalizePublicSignals");

    return this._genGenerateGenericMethodDeclaration(
      methodIdentifier,
      inputIdentifier,
      inputType,
      returnIdentifier,
      transformSignalIdentifier,
    );
  }

  private _genGenerateGenericMethodDeclaration(
    methodIdentifier: ts.Identifier,
    inputIdentifier: ts.Identifier,
    inputType: ts.TypeReferenceNode,
    returnIdentifier: ts.Identifier,
    signalTransformer: ts.Identifier,
    beforeReturn: ts.Statement[] = [],
  ): ts.MethodDeclaration {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PublicKeyword), ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      methodIdentifier,
      undefined,
      undefined,
      [ts.factory.createParameterDeclaration(undefined, undefined, inputIdentifier, undefined, inputType, undefined)],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Promise"), [
        ts.factory.createTypeReferenceNode(returnIdentifier, undefined),
      ]),
      ts.factory.createBlock(
        [
          ...beforeReturn,
          ts.factory.createReturnStatement(
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(ts.factory.createSuper(), methodIdentifier),
                undefined,
                [
                  ts.factory.createObjectLiteralExpression(
                    [
                      ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier("proof"),
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createIdentifier("proof"),
                          ts.factory.createIdentifier("proof"),
                        ),
                      ),
                      ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier("publicSignals"),
                        ts.factory.createCallExpression(
                          ts.factory.createPropertyAccessExpression(ts.factory.createThis(), signalTransformer),
                          undefined,
                          [
                            ts.factory.createPropertyAccessExpression(
                              ts.factory.createIdentifier("proof"),
                              ts.factory.createIdentifier("publicSignals"),
                            ),
                          ],
                        ),
                      ),
                    ],
                    true,
                  ),
                ],
              ),
            ),
          ),
        ],
        true,
      ),
    );
  }

  private createNormalizePublicSignalsMethod() {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
      undefined,
      ts.factory.createIdentifier("_normalizePublicSignals"),
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier("publicSignals"),
          undefined,
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("PublicSignals"), undefined),
          undefined,
        ),
      ],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("PublicMultiplier2"), undefined),
      ts.factory.createBlock(
        [
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier("signalNames"),
                  undefined,
                  undefined,
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      ts.factory.createIdentifier(this._signalNamesMethodName),
                    ),
                    undefined,
                    [],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          ts.factory.createReturnStatement(
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier("signalNames"),
                ts.factory.createIdentifier("reduce"),
              ),
              undefined,
              [
                ts.factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    ts.factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      ts.factory.createIdentifier("acc"),
                      undefined,
                      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("any"), undefined),
                      undefined,
                    ),
                    ts.factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      ts.factory.createIdentifier("signalName"),
                      undefined,
                      undefined,
                      undefined,
                    ),
                    ts.factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      ts.factory.createIdentifier("index"),
                      undefined,
                      undefined,
                      undefined,
                    ),
                  ],
                  undefined,
                  ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  ts.factory.createBlock(
                    [
                      ts.factory.createExpressionStatement(
                        ts.factory.createBinaryExpression(
                          ts.factory.createElementAccessExpression(
                            ts.factory.createIdentifier("acc"),
                            ts.factory.createIdentifier("signalName"),
                          ),
                          ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                          ts.factory.createElementAccessExpression(
                            ts.factory.createIdentifier("publicSignals"),
                            ts.factory.createIdentifier("index"),
                          ),
                        ),
                      ),
                      ts.factory.createReturnStatement(ts.factory.createIdentifier("acc")),
                    ],
                    true,
                  ),
                ),
                ts.factory.createObjectLiteralExpression([], false),
              ],
            ),
          ),
        ],
        true,
      ),
    );
  }

  private createDenormalizePublicSignalsMethod() {
    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
      undefined,
      ts.factory.createIdentifier("_denormalizePublicSignals"),
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier("publicSignals"),
          undefined,
          ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("PublicMultiplier2"), undefined),
          undefined,
        ),
      ],
      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("PublicSignals"), undefined),
      ts.factory.createBlock(
        [
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier("signalNames"),
                  undefined,
                  undefined,
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      ts.factory.createIdentifier("_getSignalNames"),
                    ),
                    undefined,
                    [],
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          ts.factory.createReturnStatement(
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier("signalNames"),
                ts.factory.createIdentifier("map"),
              ),
              undefined,
              [
                ts.factory.createArrowFunction(
                  undefined,
                  undefined,
                  [
                    ts.factory.createParameterDeclaration(
                      undefined,
                      undefined,
                      ts.factory.createIdentifier("signalName"),
                      undefined,
                      undefined,
                      undefined,
                    ),
                  ],
                  undefined,
                  ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                  ts.factory.createBlock(
                    [
                      ts.factory.createReturnStatement(
                        ts.factory.createElementAccessExpression(
                          ts.factory.createIdentifier("publicSignals"),
                          ts.factory.createIdentifier("signalName"),
                        ),
                      ),
                    ],
                    true,
                  ),
                ),
              ],
            ),
          ),
        ],
        true,
      ),
    );
  }

  private createGetSignalNamesMethod(circuitArtifact: CircuitArtifact) {
    let outputCounter: number = 0;
    const elements: ts.StringLiteral[] = [];

    for (const signal of circuitArtifact.signals) {
      if (signal.visibility === SignalVisibilityNames.Private) {
        continue;
      }

      if (signal.type === SignalTypeNames.Output) {
        elements.splice(outputCounter, 0, ts.factory.createStringLiteral(signal.name));

        outputCounter++;
        continue;
      }

      elements.push(ts.factory.createStringLiteral(signal.name));
    }

    return ts.factory.createMethodDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)],
      undefined,
      ts.factory.createIdentifier(this._signalNamesMethodName),
      undefined,
      undefined,
      [],
      ts.factory.createTypeReferenceNode(
        this._getNodeContent(
          ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
        ),
        undefined,
      ),
      ts.factory.createBlock(
        [ts.factory.createReturnStatement(ts.factory.createArrayLiteralExpression(elements, true))],
        true,
      ),
    );
  }
}
