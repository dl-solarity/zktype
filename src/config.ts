import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  circuitsASTPaths: [],
  outputArtifactsDir: "artifacts/circuits",
  outputTypesDir: "generated-types/circuits",
  clean: true,
};
