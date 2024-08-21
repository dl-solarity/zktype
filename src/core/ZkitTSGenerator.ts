import fs from "fs";
import ejs from "ejs";
import path from "path";
import ts from "typescript";
import prettier from "prettier";

import BaseTSGenerator from "./BaseTSGenerator";

import {
  ArtifactWithPath,
  CircuitArtifact,
  CircuitClass,
  Inputs,
  TypeExtensionTemplateParams,
  DefaultWrapperTemplateParams,
  WrapperTemplateParams,
  SignalInfo,
} from "../types";

import { normalizeName } from "../utils";
import { SignalTypeNames, SignalVisibilityNames } from "../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  protected async _genHardhatZkitTypeExtension(circuits: {
    [circuitName: string]: ArtifactWithPath[];
  }): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "type-extension.ts.ejs"), "utf8");

    const circuitClasses: CircuitClass[] = [];

    const keys = Object.keys(circuits);

    for (let i = 0; i < keys.length; i++) {
      const artifacts = circuits[keys[i]];

      if (artifacts.length === 1) {
        circuitClasses.push({
          name: this._getCircuitName(artifacts[0].circuitArtifact),
          object: this._getCircuitName(artifacts[0].circuitArtifact),
        });

        continue;
      }

      for (const artifact of artifacts) {
        circuitClasses.push({
          name: this._getFullCircuitName(artifact.circuitArtifact),
          object: this._getObjectPath(artifact.pathToGeneratedFile),
        });
      }
    }

    const templateParams: TypeExtensionTemplateParams = {
      circuitClasses,
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }

  protected _getObjectPath(pathToGeneratedFile: string): string {
    return path
      .normalize(pathToGeneratedFile.replace(this.getOutputTypesDir(), ""))
      .split(path.sep)
      .filter((level) => level !== "")
      .map((level, index, array) => (index !== array.length - 1 ? normalizeName(level) : level.replace(".ts", "")))
      .join(".");
  }

  protected async _genCircuitWrapperClassContent(
    circuitArtifact: CircuitArtifact,
    pathToGeneratedFile: string,
  ): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "circuit-wrapper.ts.ejs"), "utf8");

    let outputCounter: number = 0;
    const publicInputs: Inputs[] = [];

    const privateInputs: Inputs[] = circuitArtifact.baseCircuitInfo.signals
      .filter((signal) => signal.type != SignalTypeNames.Output)
      .map((signal) => {
        return {
          name: signal.name,
          dimensions: "[]".repeat(signal.dimension.length),
          dimensionsArray: new Array(signal.dimension).join(", "),
        };
      });

    let calldataPubSignalsCount = 0;
    for (const signal of circuitArtifact.baseCircuitInfo.signals) {
      if (signal.visibility === SignalVisibilityNames.Private) {
        continue;
      }

      if (signal.type === SignalTypeNames.Output) {
        publicInputs.splice(outputCounter, 0, {
          name: signal.name,
          dimensions: "[]".repeat(signal.dimension.length),
          dimensionsArray: new Array(signal.dimension).join(", "),
        });

        calldataPubSignalsCount += this._getPublicSignalsCount(signal);
        outputCounter++;
        continue;
      }

      publicInputs.push({
        name: signal.name,
        dimensions: "[]".repeat(signal.dimension.length),
        dimensionsArray: new Array(signal.dimension).join(", "),
      });

      calldataPubSignalsCount += this._getPublicSignalsCount(signal);
    }

    const pathToUtils = path.join(this.getOutputTypesDir(), "utils");
    const templateParams: WrapperTemplateParams = {
      circuitClassName: this._getCircuitName(circuitArtifact),
      publicInputsTypeName: this._getTypeName(circuitArtifact, "Public"),
      calldataPubSignalsType: this._getCalldataPubSignalsType(calldataPubSignalsCount),
      publicInputs,
      privateInputs,
      proofTypeName: this._getTypeName(circuitArtifact, "Proof"),
      privateInputsTypeName: this._getTypeName(circuitArtifact, "Private"),
      pathToUtils: path.relative(path.dirname(pathToGeneratedFile), pathToUtils),
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }

  protected async _genDefaultCircuitWrapperClassContent(circuitArtifact: CircuitArtifact): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "default-circuit-wrapper.ts.ejs"), "utf8");

    const templateParams: DefaultWrapperTemplateParams = {
      circuitClassName: this._getCircuitName(circuitArtifact),
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }

  private _getCalldataPubSignalsType(pubSignalsCount: number): string {
    const calldataType = new Array(pubSignalsCount).fill(ts.factory.createTypeReferenceNode("NumericString"));

    return this._getNodeContent(ts.factory.createTupleTypeNode(calldataType));
  }

  private _getPublicSignalsCount(signal: SignalInfo): number {
    if (signal.dimension.length === 0) {
      return 1;
    }

    return signal.dimension.reduce((acc: number, dim: string) => acc * Number(dim), 1);
  }
}
