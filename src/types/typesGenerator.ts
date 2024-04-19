import { CircuitArtifact } from "./circuitArtifact";

export interface ArtifactWithPath {
  circuitArtifact: CircuitArtifact;
  pathToGeneratedFile: string;
}
