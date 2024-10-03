import { CircuitTypesGenerator } from "../../src";
import { findProjectRoot } from "../../src/utils";

const circuitTypesGenerator = new CircuitTypesGenerator({
  basePath: "test/fixture",
  projectRoot: findProjectRoot(process.cwd()),
  circuitsArtifactsPaths: ["test/fixture-cache/Multiplier2_artifacts.json"],
});

// circuitTypesGenerator.generateTypes().then(console.log).catch(console.error);
