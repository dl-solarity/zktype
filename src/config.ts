import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  projectRoot: process.cwd(),
  circuitsArtifactsPaths: [],
  outputArtifactsDir: "artifacts/circuits",
  outputTypesDir: "generated-types/circuits",
};
