import { CircuitArtifact } from "./circuitArtifact";

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
}

export interface Inputs {
  name: string;
  dimensions: string;
  dimensionsArray: string;
}

export interface DefaultWrapperTemplateParams {
  circuitClassName: string;
}

export interface WrapperTemplateParams {
  publicInputsTypeName: string;
  privateInputs: Inputs[];
  publicInputs: Inputs[];
  calldataPubSignalsType: string;
  proofTypeName: string;
  privateInputsTypeName: string;
  circuitClassName: string;
  pathToUtils: string;
}

export interface CircuitClass {
  name: string;
  object: string;
}

export interface TypeExtensionTemplateParams {
  circuitClasses: CircuitClass[];
}
