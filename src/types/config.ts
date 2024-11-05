import { ProtocolType } from "./circuitArtifact";

export interface CircuitArtifactData {
  artifactPath: string;
  circuitProtocolType: ProtocolType[];
}

export interface ZKTypeConfig {
  /**
   * The path to the directory where the generated types will be stored.
   */
  outputTypesDir?: string;

  /**
   * The base path to the root directory of the project where circuits are stored.
   */
  basePath: string;

  /**
   * An array of object containing the path to the circuit artifact and the protocol type of the circuit.
   */
  circuitsArtifactsPaths: CircuitArtifactData[];

  /**
   * The absolute path to the root directory of the project.
   */
  projectRoot: string;
}
