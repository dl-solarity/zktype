import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  circuitsASTPaths: [],
  outputArtifactsDir: "artifacts/circuits",
  outputTypesDir: "generated-types/circuits",
  clean: true,
};
