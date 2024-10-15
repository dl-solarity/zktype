import { CircuitArtifact } from "./circuitArtifact";
import { Groth16CalldataPointsType, PlonkCalldataPointsType } from "../constants/protocol";

export interface CircuitSet {
  [circuitName: string]: ArtifactWithPath[];
}

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
  protocol: string;
}

export interface Inputs {
  name: string;
  dimensions: string;
  dimensionsArray: string;
}

export interface WrapperTemplateParams {
  protocolTypeName: "groth16" | "plonk";
  protocolImplementerName: "Groth16Implementer" | "PlonkImplementer";
  proofTypeInternalName: "Groth16Proof" | "PlonkProof";
  publicInputsTypeName: string;
  privateInputs: Inputs[];
  publicInputs: Inputs[];
  calldataPointsType: typeof Groth16CalldataPointsType | typeof PlonkCalldataPointsType;
  calldataPubSignalsType: string;
  proofTypeName: string;
  privateInputsTypeName: string;
  calldataTypeName: string;
  circuitClassName: string;
  pathToUtils: string;
}

export interface CircuitClass {
  name: string;
  object: string;
  protocol?: string;
}

export interface TypeExtensionTemplateParams {
  circuitClasses: CircuitClass[];
}

export interface GeneratedCircuitWrapperResult {
  content: string;
  className: string;
  protocol: string;
}
