import { CircuitArtifact } from "./circuitArtifact";

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
}

export interface WrapperTemplateParams {
  publicInputsInterfaceName: string;
  privateInputs: string[];
  publicInputs: string[];
  proofInterfaceName: string;
  privateInputsInterfaceName: string;
  circuitClassName: string;
}

export interface TypeExtensionTemplateParams {
  circuitClassNames: string[];
}
