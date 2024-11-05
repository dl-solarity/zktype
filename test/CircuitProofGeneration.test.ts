import { expect } from "chai";

import { CircuitZKitConfig } from "@solarity/zkit";

import { CircuitTypesGenerator } from "../src";
import { findProjectRoot } from "../src/utils";

describe("Circuit Proof Generation", function () {
  const circuitTypesGenerator = new CircuitTypesGenerator({
    basePath: "test/fixture",
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

  const basicConfig: CircuitZKitConfig = {
    circuitName: "Multiplier2",
    circuitArtifactsPath: "test/fixture-cache/artifacts/Basic.circom",
    verifierDirPath: "",
  };

  const matrixConfig: CircuitZKitConfig = {
    circuitName: "Matrix",
    circuitArtifactsPath: "test/fixture-cache/artifacts/auth/Matrix.circom",
    verifierDirPath: "",
  };

  beforeEach(async () => {
    await circuitTypesGenerator.generateTypes();
  });

  it("should generate and verify proof for Basic.circom", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("circuits/fixture/Basic.circom:Multiplier2Groth16");

    const circuit = new object(basicConfig);

    const proof = await circuit.generateProof({ in1: 2, in2: 3 });
    expect(await circuit.verifyProof(proof)).to.be.true;

    const calldata = await circuit.generateCalldata(proof);
    expect(calldata[3].length).to.equal(2);
  });

  it("should generate and verify proof for Matrix.circom", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("Matrix");

    const circuit = new object(matrixConfig);

    const proof = await circuit.generateProof({
      a: [
        [1n, 2n, 3n],
        [1n, 2n, 3n],
        [1n, 2n, 3n],
      ],
      b: [
        [1n, 2n, 3n],
        [1n, 2n, 3n],
        [1n, 2n, 3n],
      ],
      c: 9n,
    });

    expect(await circuit.verifyProof(proof)).to.be.true;

    const calldata = await circuit.generateCalldata(proof);
    expect(calldata[3].length).to.equal(36);
  });

  it("should correctly import all of the zktype objects", async () => {
    new (await circuitTypesGenerator.getCircuitObject("EnhancedMultiplier"))();
    new (await circuitTypesGenerator.getCircuitObject("Matrix"))();
    new (await circuitTypesGenerator.getCircuitObject("circuits/fixture/auth/BasicInAuth.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("circuits/fixture/lib/BasicInLib.circom:Multiplier2", "plonk"))();
    new (await circuitTypesGenerator.getCircuitObject(
      "circuits/fixture/lib/BasicInLib.circom:Multiplier2",
      "groth16",
    ))();
    new (await circuitTypesGenerator.getCircuitObject("circuits/fixture/Basic.circom:Multiplier2", "groth16"))();
    new (await circuitTypesGenerator.getCircuitObject("circuits/fixture/Basic.circom:Multiplier2", "plonk"))();
    new (await circuitTypesGenerator.getCircuitObject("CredentialAtomicQueryMTPOnChainVoting", "groth16"))();
    new (await circuitTypesGenerator.getCircuitObject("CredentialAtomicQueryMTPOnChainVoting", "plonk"))();

    await expect(
      circuitTypesGenerator.getCircuitObject("circuits/fixture/lib/Basic.circom:Multiplier2Groth16"),
    ).to.be.rejectedWith("Circuit Multiplier2Groth16 type does not exist.");
    await expect(circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier3")).to.be.rejectedWith(
      "Circuit Multiplier3 type does not exist.",
    );
  });
});
