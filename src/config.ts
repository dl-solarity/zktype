import { CircuitProcessorConfig } from "./types/config";

export const defaultCircuitProcessorConfig: CircuitProcessorConfig = {
  defaultFolder: "circuits",
  skip: [],
  only: [],
  strict: false,
  clean: true,
};

export const defaultCircuitArtifactGeneratorConfig = {
  clean: true,
};
