import fs from "fs";
import ejs from "ejs";
import path from "path";
import prettier from "prettier";

import BaseTSGenerator from "./BaseTSGenerator";

import { CircuitArtifact, TemplateParams } from "../../types";

import { SignalTypeNames, SignalVisibilityNames } from "../../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  protected async _genCircuitWrapperClassContent(circuitArtifact: CircuitArtifact): Promise<string> {
    const template = fs.readFileSync(path.join(__dirname, "templates", "circuit-wrapper.ts.ejs"), "utf8");

    let outputCounter: number = 0;
    const publicInputs: string[] = [];

    const privateInputs: string[] = circuitArtifact.signals
      .filter((signal) => signal.type != SignalTypeNames.Output)
      .map((signal) => {
        return signal.name;
      });

    for (const signal of circuitArtifact.signals) {
      if (signal.visibility === SignalVisibilityNames.Private) {
        continue;
      }

      if (signal.type === SignalTypeNames.Output) {
        publicInputs.splice(outputCounter, 0, signal.name);

        outputCounter++;
        continue;
      }

      publicInputs.push(signal.name);
    }

    const templateParams: TemplateParams = {
      circuitClassName: `${circuitArtifact.circuitName}Circuit`,
      publicInputsInterfaceName: this._getInterfaceName(circuitArtifact, "Public"),
      publicInputs,
      privateInputs,
      proofInterfaceName: this._getInterfaceName(circuitArtifact, "Proof"),
      privateInputsInterfaceName: this._getInterfaceName(circuitArtifact, "Private"),
    };

    return await prettier.format(ejs.render(template, templateParams), { parser: "typescript" });
  }
}
