import fs from "fs";
import ejs from "ejs";
import path from "path";
import prettier from "prettier";

import BaseTSGenerator from "./BaseTSGenerator";

import {
  ArtifactWithPath,
  CircuitArtifact,
  CircuitClass,
  Inputs,
  TypeExtensionTemplateParams,
  WrapperTemplateParams,
} from "../types";

import { normalizeName } from "../utils";
import { SignalTypeNames, SignalVisibilityNames } from "../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  protected _nameToObjectNameMap: Map<string, string> = new Map();

  protected async _genHardhatZkitTypeExtension(circuits: {
    [circuitName: string]: ArtifactWithPath[];
  }): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "type-extension.ts.ejs"), "utf8");

    const circuitClasses: CircuitClass[] = [];

    const keys = Object.keys(circuits);

    const outputTypesDir = this.getOutputTypesDir();

    for (let i = 0; i < keys.length; i++) {
      const artifacts = circuits[keys[i]];

      if (artifacts.length === 1) {
        circuitClasses.push({
          name: this._getCircuitName(artifacts[0].circuitArtifact),
          object: this._getCircuitName(artifacts[0].circuitArtifact),
        });

        this._nameToObjectNameMap.set(
          this._getCircuitName(artifacts[0].circuitArtifact),
          this._getCircuitName(artifacts[0].circuitArtifact),
        );

        continue;
      }

      for (const artifact of artifacts) {
        const objectName = path
          .normalize(artifact.pathToGeneratedFile.replace(outputTypesDir, ""))
          .split(path.sep)
          .filter((level) => level !== "")
          .map((level, index, array) => (index !== array.length - 1 ? normalizeName(level) : level.replace(".ts", "")))
          .join(".");

        circuitClasses.push({
          name: this._getFullCircuitName(artifact.circuitArtifact),
          object: objectName,
        });

        this._nameToObjectNameMap.set(this._getFullCircuitName(artifact.circuitArtifact), objectName);
      }
    }

    const templateParams: TypeExtensionTemplateParams = {
      circuitClasses,
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }

  protected async _genCircuitWrapperClassContent(circuitArtifact: CircuitArtifact): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "circuit-wrapper.ts.ejs"), "utf8");

    let outputCounter: number = 0;
    const publicInputs: Inputs[] = [];

    const privateInputs: Inputs[] = circuitArtifact.signals
      .filter((signal) => signal.type != SignalTypeNames.Output)
      .map((signal) => {
        return { name: signal.name, dimensions: "[]".repeat(signal.dimensions) };
      });

    for (const signal of circuitArtifact.signals) {
      if (signal.visibility === SignalVisibilityNames.Private) {
        continue;
      }

      if (signal.type === SignalTypeNames.Output) {
        publicInputs.splice(outputCounter, 0, { name: signal.name, dimensions: "[]".repeat(signal.dimensions) });

        outputCounter++;
        continue;
      }

      publicInputs.push({ name: signal.name, dimensions: "[]".repeat(signal.dimensions) });
    }

    const templateParams: WrapperTemplateParams = {
      circuitClassName: this._getCircuitName(circuitArtifact),
      publicInputsInterfaceName: this._getInterfaceName(circuitArtifact, "Public"),
      publicInputs,
      privateInputs,
      proofInterfaceName: this._getInterfaceName(circuitArtifact, "Proof"),
      privateInputsInterfaceName: this._getInterfaceName(circuitArtifact, "Private"),
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }
}
