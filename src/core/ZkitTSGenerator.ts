import fs from "fs";
import ejs from "ejs";
import path from "path";
import prettier from "prettier";

import BaseTSGenerator from "./BaseTSGenerator";

import { CircuitArtifact, Inputs, TypeExtensionTemplateParams, WrapperTemplateParams } from "../types";

import { SignalTypeNames, SignalVisibilityNames } from "../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  protected async _genHardhatZkitTypeExtension(circuitNames: string[]): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "type-extension.ts.ejs"), "utf8");

    const templateParams: TypeExtensionTemplateParams = {
      circuitClassNames: circuitNames,
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
