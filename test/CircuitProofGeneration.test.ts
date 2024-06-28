import { expect } from "chai";

import { CircuitZKitConfig } from "@solarity/zkit";

import Multiplier2Circuit from "../generated-types/circuits/core/Multiplier2";

import { generateAST } from "./helpers/generator";

import CircuitTypesGenerator from "../src/core/CircuitTypesGenerator";

describe("Circuit Proof Generation", function () {
  const astDir = "test/cache/circuits-ast";

  const circuitTypesGenerator = new CircuitTypesGenerator({
    basePath: "test/fixture",
    circuitsASTPaths: ["test/cache/circuits-ast/Basic.json"],
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
    const object = await circuitTypesGenerator.getCircuitObject("Multiplier2Circuit");
    const circuit = new object(config);

    const proof = await circuit.generateProof({ in1: 2, in2: 3 });
    expect(await circuit.verifyProof(proof)).to.be.true;
  });
});
