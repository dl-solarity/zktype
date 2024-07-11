import { CircuitArtifact } from "./circuitArtifact";

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
}

export interface Inputs {
  name: string;
  dimensions: string;
}

export interface WrapperTemplateParams {
  publicInputsInterfaceName: string;
  privateInputs: Inputs[];
  publicInputs: Inputs[];
  calldataPubSignalsType: string;
  proofInterfaceName: string;
  privateInputsInterfaceName: string;
  circuitClassName: string;
}

export interface CircuitClass {
  name: string;
  object: string;
}

export interface TypeExtensionTemplateParams {
  circuitClasses: CircuitClass[];
}
