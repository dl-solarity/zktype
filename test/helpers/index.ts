import { CircuitTypesGenerator } from "../../src";
import { findProjectRoot } from "../../src/utils";

const circuitTypesGenerator = new CircuitTypesGenerator({
  basePath: "circuits/fixture",
  projectRoot: findProjectRoot(process.cwd()),
  circuitsArtifacts: [
    {
      artifactPath: "test/fixture-cache/auth/EnhancedMultiplier_artifacts.json",
      circuitProtocolType: ["groth16"],
    },
    {
      artifactPath: "test/fixture-cache/auth/Matrix_artifacts.json",
      circuitProtocolType: ["groth16"],
    },
    {
      artifactPath: "test/fixture-cache/auth/Multiplier2_artifacts.json",
      circuitProtocolType: ["plonk"],
    },
    {
      artifactPath: "test/fixture-cache/lib/Multiplier2_artifacts.json",
      circuitProtocolType: ["groth16", "groth16", "plonk"],
    },
    {
      artifactPath: "test/fixture-cache/CredentialAtomicQueryMTPOnChainVoting_artifacts.json",
      circuitProtocolType: ["groth16", "plonk"],
    },
    {
      artifactPath: "test/fixture-cache/Multiplier2_artifacts.json",
      circuitProtocolType: ["groth16", "plonk"],
    },
  ],
});

// circuitTypesGenerator.generateTypes().then(console.log).catch(console.error);
