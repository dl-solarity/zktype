import { ZKTypeConfig } from "./types";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  projectRoot: process.cwd(),
  circuitsArtifactsPaths: [],
  outputTypesDir: "generated-types/circuits",
};
