import fs from "fs";
import path from "path";

import { expect } from "chai";

import { findProjectRoot } from "../src/utils";

import { CircuitTypesGenerator } from "../src";

describe("Circuit Types Generation", function () {
  const expectedTypes = [
    "core/lib/BasicInLib.circom/Multiplier2Groth16.ts",
    "core/lib/BasicInLib.circom/Multiplier2Plonk.ts",
    "core/auth/EnhancedMultiplier.ts",
    "core/auth/Matrix.ts",
    "core/auth/Multiplier2.ts",
    "core/Basic.circom/Multiplier2Groth16.ts",
    "core/Basic.circom/Multiplier2Plonk.ts",
    "core/lib/BasicInLib.circom/Multiplier2Groth16.ts",
    "core/lib/BasicInLib.circom/Multiplier2Plonk.ts",
    "core/CredentialAtomicQueryMTPOnChainVotingPlonk.ts",
    "core/CredentialAtomicQueryMTPOnChainVotingGroth16.ts",
  ];

  const circuitTypesGenerator = new CircuitTypesGenerator({
    basePath: "circuits/fixture",
    projectRoot: findProjectRoot(process.cwd()),
    circuitsArtifactsPaths: [
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

  function getPathToGeneratedType(generatedTypePath: string) {
    return path.join(circuitTypesGenerator.getOutputTypesDir(), generatedTypePath);
  }

  afterEach(async () => {
    if (fs.existsSync(circuitTypesGenerator.getOutputTypesDir())) {
      fs.rmSync(circuitTypesGenerator.getOutputTypesDir(), { recursive: true, force: true });
    }
  });

  it("should generate Circuit Types based on the Artifacts", async () => {
    await circuitTypesGenerator.generateTypes();

    for (const fileTypePath of expectedTypes) {
      const pathToCircuit = getPathToGeneratedType(fileTypePath);

      expect(fs.existsSync(pathToCircuit)).to.be.true;
    }
  });
});
