import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  projectRoot: process.cwd(),
  circuitsASTPaths: [],
  outputArtifactsDir: "artifacts/circuits",
  outputTypesDir: "generated-types/circuits",
};
