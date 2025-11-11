import { ZKTypeConfig } from "./types/index.js";

export const defaultCircuitArtifactGeneratorConfig: ZKTypeConfig = {
  basePath: "circuits",
  projectRoot: process.cwd(),
  circuitsArtifacts: [],
  outputTypesDir: "generated-types/circuits",
  signalNamesTypeLimit: 50000,
};
