import { CircuitArtifact, ProtocolType } from "./circuitArtifact";

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
  protocolTypeName: ProtocolType;
  protocolImplementerName: "Groth16Implementer" | "PlonkImplementer";
  proofTypeInternalName: "Groth16Proof" | "PlonkProof";
  publicInputsTypeName: string;
  privateInputs: Inputs[];
  publicInputs: Inputs[];
  calldataProofPointsType: "Groth16ProofPoints" | "PlonkProofPoints";
  calldataPubSignalsType: string;
  proofTypeName: string;
  privateInputsTypeName: string;
  calldataTypeName: string;
  circuitClassName: string;
  pathToUtils: string;
  signalNames: string[];
  signalNamesTypeLimit: number;
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
