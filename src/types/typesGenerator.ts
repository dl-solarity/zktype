import { CircuitArtifact } from "./circuitArtifact";

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
}

export interface TemplateParams {
  publicInputsInterfaceName: string;
  privateInputs: string[];
  publicInputs: string[];
  proofInterfaceName: string;
  privateInputsInterfaceName: string;
  circuitClassName: string;
}
