import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  projectRoot: process.cwd(),
  circuitsArtifacts: [],
  outputTypesDir: "generated-types/circuits",
};
