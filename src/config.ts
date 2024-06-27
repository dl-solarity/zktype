import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  inputDir: "circuits",
  outputArtifactsDir: "artifacts/circuits",
  outputTypesDir: "generated-types/circuits",
  clean: true,
};
