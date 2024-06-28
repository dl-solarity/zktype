import { expect } from "chai";

import { CircuitZKitConfig } from "@solarity/zkit";

import Multiplier2Circuit from "../generated-types/circuits/core/Multiplier2";

import { generateAST } from "./helpers/generator";

import CircuitTypesGenerator from "../src/core/codegen/CircuitTypesGenerator";

describe("Circuit Proof Generation", function () {
  const astDir = "test/cache/circuits-ast";

  const circuitTypesGenerator = new CircuitTypesGenerator({ inputDir: astDir });

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
    const circuit = new Multiplier2Circuit(config);

    const proof = await circuit.generateProof({ in1: 2, in2: 3 });
    expect(await circuit.verifyProof(proof)).to.be.true;
  });
});
