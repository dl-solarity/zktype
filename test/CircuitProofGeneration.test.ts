import { expect } from "chai";

import { CircuitZKitConfig } from "@solarity/zkit";

import Multiplier2Circuit from "../generated-types/circuits/core/Multiplier2";

import { generateAST } from "./helpers/generator";

import CircuitTypesGenerator from "../src/core/CircuitTypesGenerator";

describe("Circuit Proof Generation", function () {
  const astDir = "test/cache/circuits-ast";

  const circuitTypesGenerator = new CircuitTypesGenerator({
    basePath: "test/fixture",
    circuitsASTPaths: [
      "test/cache/circuits-ast/Basic.json",
      "test/cache/circuits-ast/credentialAtomicQueryMTPV2OnChainVoting.json",
      "test/cache/circuits-ast/lib/BasicInLib.json",
      "test/cache/circuits-ast/auth/BasicInAuth.json",
      "test/cache/circuits-ast/auth/EMultiplier.json",
    ],
  });

  const config: CircuitZKitConfig = {
    circuitName: "Basic",
    circuitArtifactsPath: "test/cache/Basic",
    verifierDirPath: "test/cache",
  };

  beforeEach(async () => {
    const preprocessor = await generateAST("test/fixture", astDir, true, [], []);
    await circuitTypesGenerator.generateTypes();
    await preprocessor.circuitCompiler.compileCircuit("test/fixture/Basic.circom", config.circuitArtifactsPath);
  });

  it("should generate and verify proof", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier2");

    const circuit = new object(config);

    const proof = await circuit.generateProof({ in1: 2, in2: 3 });
    expect(await circuit.verifyProof(proof)).to.be.true;
  });

  it("should correctly import all of the zktype objects", async () => {
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/auth/BasicInAuth.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/lib/BasicInLib.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("CredentialAtomicQueryMTPOnChainVoting"))();
    new (await circuitTypesGenerator.getCircuitObject("EnhancedMultiplier"))();

    await expect(circuitTypesGenerator.getCircuitObject("Multiplier2")).to.be.rejectedWith(
      "Circuit Multiplier2 type does not exist.",
    );
  });
});
