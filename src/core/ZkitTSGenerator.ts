import fs from "fs";
import ejs from "ejs";
import path from "path";
import ts from "typescript";
import prettier from "prettier";

import { iterateSymFile } from "@solarity/zkit";

import BaseTSGenerator from "./BaseTSGenerator";

import {
  CircuitArtifact,
  CircuitClass,
  Inputs,
  TypeExtensionTemplateParams,
  WrapperTemplateParams,
  SignalInfo,
  GeneratedCircuitWrapperResult,
  CircuitSet,
  ProtocolType,
  ArtifactWithPath,
} from "../types";

import { normalizeName } from "../utils";
import { SIGNAL_NAMES_TYPE_CAP, SignalTypeNames, SignalVisibilityNames } from "../constants";

export default class ZkitTSGenerator extends BaseTSGenerator {
  protected async _genHardhatZkitTypeExtension(circuits: CircuitSet): Promise<string> {
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

      if (artifacts.length === 2 && artifacts[0].protocol !== artifacts[1].protocol) {
        circuitClasses.push({
          name: this._getCircuitName(artifacts[0].circuitArtifact),
          object: this._getCircuitName(artifacts[0].circuitArtifact) + this._getPrefix(artifacts[0].protocol!),
          protocol: artifacts[0].protocol,
        });

        circuitClasses.push({
          name: this._getCircuitName(artifacts[1].circuitArtifact),
          object: this._getCircuitName(artifacts[1].circuitArtifact) + this._getPrefix(artifacts[1].protocol!),
          protocol: artifacts[1].protocol,
        });

        continue;
      }

      const isProtocolTypeTheSame = this._isProtocolTypeTheSame(artifacts);

      for (const artifact of artifacts) {
        circuitClasses.push({
          name: this._getFullCircuitName(artifact.circuitArtifact),
          object: this._getObjectPath(artifact.pathToGeneratedFile),
          protocol: isProtocolTypeTheSame ? undefined : artifact.protocol,
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

  protected async _genCircuitWrappersClassContent(
    circuitArtifact: CircuitArtifact,
    pathToGeneratedFile: string,
  ): Promise<GeneratedCircuitWrapperResult[]> {
    const result: GeneratedCircuitWrapperResult[] = [];

    const unifiedProtocolType = this._getUnifiedProtocolType(circuitArtifact);
    for (const protocolType of unifiedProtocolType) {
      const content = await this._genSingleCircuitWrapperClassContent(
        circuitArtifact,
        pathToGeneratedFile,
        protocolType,
        unifiedProtocolType.size > 1,
      );

      result.push(content);
    }

    return result;
  }

  private async _genSingleCircuitWrapperClassContent(
    circuitArtifact: CircuitArtifact,
    pathToGeneratedFile: string,
    protocolType: "groth16" | "plonk",
    isPrefixed: boolean = false,
  ): Promise<GeneratedCircuitWrapperResult> {
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

    const pathToUtils = path.join(this.getOutputTypesDir(), "helpers");
    const circuitClassName = this._getCircuitName(circuitArtifact) + (isPrefixed ? this._getPrefix(protocolType) : "");

    let signalNames: string[] = [];

    const symFilePath = circuitArtifact.compilerOutputFiles["sym"]?.fileSourcePath;

    if (symFilePath && fs.existsSync(symFilePath)) {
      signalNames = await this._extractSignalNames(symFilePath);
    }

    const signalNamesTypeLimit = Math.min(
      this._zktypeConfig.signalNamesTypeLimit ?? SIGNAL_NAMES_TYPE_CAP,
      SIGNAL_NAMES_TYPE_CAP,
    );

    const templateParams: WrapperTemplateParams = {
      protocolTypeName: protocolType,
      protocolImplementerName: this._getProtocolImplementerName(protocolType),
      proofTypeInternalName: this._getProofTypeInternalName(protocolType),
      circuitClassName,
      publicInputsTypeName: this._getTypeName(circuitArtifact, this._getPrefix(protocolType), "Public"),
      calldataPubSignalsType: this._getCalldataPubSignalsType(calldataPubSignalsCount),
      publicInputs,
      privateInputs,
      calldataProofPointsType: this._getCalldataProofPointsType(protocolType),
      proofTypeName: this._getTypeName(circuitArtifact, this._getPrefix(protocolType), "Proof"),
      calldataTypeName: this._getTypeName(circuitArtifact, this._getPrefix(protocolType), "Calldata"),
      privateInputsTypeName: this._getTypeName(circuitArtifact, this._getPrefix(protocolType), "Private"),
      pathToUtils: path.relative(path.dirname(pathToGeneratedFile), pathToUtils),
      signalNames: signalNames,
      signalNamesTypeLimit: signalNamesTypeLimit,
      witnessOverridesTypeName: this._getWitnessOverridesTypeName(signalNames.length, signalNamesTypeLimit),
    };

    return {
      content: await prettier.format(ejs.render(template, templateParams), { parser: "typescript" }),
      className: circuitClassName,
      protocol: protocolType,
    };
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

  private _getProtocolImplementerName(protocolType: string): any {
    switch (protocolType) {
      case "groth16":
        return "Groth16Implementer";
      case "plonk":
        return "PlonkImplementer";
      default:
        throw new Error(`Unknown protocol: ${protocolType}`);
    }
  }

  private _getProofTypeInternalName(protocolType: string): any {
    switch (protocolType) {
      case "groth16":
        return "Groth16Proof";
      case "plonk":
        return "PlonkProof";
      default:
        throw new Error(`Unknown protocol: ${protocolType}`);
    }
  }

  private _getCalldataProofPointsType(protocolType: string): any {
    switch (protocolType) {
      case "groth16":
        return "Groth16ProofPoints";
      case "plonk":
        return "PlonkProofPoints";
      default:
        throw new Error(`Unknown protocol: ${protocolType}`);
    }
  }

  protected _getPrefix(protocolType: string): string {
    switch (protocolType) {
      case "groth16":
        return "Groth16";
      case "plonk":
        return "Plonk";
      default:
        throw new Error(`Unknown protocol: ${protocolType}`);
    }
  }

  private _getUnifiedProtocolType(circuitArtifact: CircuitArtifact): Set<ProtocolType> {
    if (!circuitArtifact.baseCircuitInfo.protocol) {
      throw new Error(`INTERNAL ERROR. Open a bug report please!`);
    }

    return new Set(circuitArtifact.baseCircuitInfo.protocol);
  }

  private _getWitnessOverridesTypeName(signalCount: number, signalNamesTypeLimit: number): string {
    return signalCount > signalNamesTypeLimit
      ? "Record<string, bigint>"
      : "Partial<Record<QualifiedSignalNames, bigint>>";
  }

  private async _extractSignalNames(symFilePath: string): Promise<string[]> {
    const signalNames: string[] = [];

    await iterateSymFile(symFilePath, (signalInfo) => {
      if (BigInt(signalInfo.witnessIndex) >= 0) {
        signalNames.push(signalInfo.signalName);
      }
    });

    return signalNames;
  }

  private _isProtocolTypeTheSame(artifactWithPaths: ArtifactWithPath[]) {
    return artifactWithPaths.every((circuit) => circuit.protocol === artifactWithPaths[0].protocol);
  }
}
