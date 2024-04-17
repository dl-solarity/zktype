import { CircuitProcessorConfig } from "./types";

export const defaultCircuitProcessorConfig: CircuitProcessorConfig = {
  defaultFolder: "circuits",
  skip: [],
  only: [],
  strict: false,
  clean: true,
  quiet: false,
};

export const defaultCircuitArtifactGeneratorConfig = {
  clean: true,
};
