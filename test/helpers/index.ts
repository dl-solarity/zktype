import { CircuitTypesGenerator } from "../../src";
import { findProjectRoot } from "../../src/utils";

const circuitTypesGenerator = new CircuitTypesGenerator({
  basePath: "circuits/fixture",
  projectRoot: findProjectRoot(process.cwd()),
  circuitsArtifactsPaths: [
    "test/fixture-cache/auth/EnhancedMultiplier_artifacts.json",
    "test/fixture-cache/auth/Matrix_artifacts.json",
    "test/fixture-cache/auth/Multiplier2_artifacts.json",
    "test/fixture-cache/lib/Multiplier2_artifacts.json",
    "test/fixture-cache/CredentialAtomicQueryMTPOnChainVoting_artifacts.json",
    "test/fixture-cache/Multiplier2_artifacts.json",
  ],
});

// circuitTypesGenerator.generateTypes().then(console.log).catch(console.error);
