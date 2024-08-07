import fs from "fs";
import { expect } from "chai";

import { CircuitZKitConfig } from "@solarity/zkit";

import { generateAST } from "./helpers/generator";

import { CircuitTypesGenerator } from "../src";
import { findProjectRoot } from "../src/utils";

describe("Circuit Proof Generation", function () {
  const astDir = "test/cache/circuits-ast";

  const circuitTypesGenerator = new CircuitTypesGenerator({
    basePath: "test/fixture",
    projectRoot: findProjectRoot(process.cwd()),
    circuitsASTPaths: [
      "test/cache/circuits-ast/Basic.json",
      "test/cache/circuits-ast/credentialAtomicQueryMTPV2OnChainVoting.json",
      "test/cache/circuits-ast/lib/BasicInLib.json",
      "test/cache/circuits-ast/auth/BasicInAuth.json",
      "test/cache/circuits-ast/auth/EMultiplier.json",
    ],
  });

  const basicConfig: CircuitZKitConfig = {
    circuitName: "Basic",
    circuitArtifactsPath: "test/cache/Basic",
    verifierDirPath: "test/cache",
  };

  const matrixConfig: CircuitZKitConfig = {
    circuitName: "Matrix",
    circuitArtifactsPath: "test/cache/Matrix",
    verifierDirPath: "test/cache",
  };

  const complexMainConfig: CircuitZKitConfig = {
    circuitName: "ComplexMain",
    circuitArtifactsPath: "test/cache/ComplexMain",
    verifierDirPath: "test/cache",
  };

  beforeEach(async () => {
    const preprocessor = await generateAST("test/fixture", astDir, true, [], []);
    await circuitTypesGenerator.generateTypes();
    await preprocessor.circuitCompiler.compileCircuit("test/fixture/Basic.circom", basicConfig.circuitArtifactsPath);
    await preprocessor.circuitCompiler.compileCircuit(
      "test/fixture/auth/Matrix.circom",
      matrixConfig.circuitArtifactsPath,
    );
    await preprocessor.circuitCompiler.compileCircuit(
      "test/fixture/ComplexMain.circom",
      complexMainConfig.circuitArtifactsPath,
    );
  });

  it("should generate and verify proof for Basic.circom", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier2");

    const circuit = new object(basicConfig);

    const proof = await circuit.generateProof({ in1: 2, in2: 3 });
    expect(await circuit.verifyProof(proof)).to.be.true;

    const calldata = await circuit.generateCalldata(proof);
    expect(calldata[3].length).to.equal(2);
  });

  it("should generate and verify proof for ComplexMain.circom", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("ComplexMain");

    const circuit = new object(complexMainConfig);

    const proof = await circuit.generateProof({
      in1: 2n,
      in2: 3n,
    });

    expect(await circuit.verifyProof(proof)).to.be.true;

    const calldata = await circuit.generateCalldata(proof);
    expect(calldata[3].length).to.equal(2);
  });

  it("should generate and verify proof for Matrix.circom", async () => {
    const object = await circuitTypesGenerator.getCircuitObject("test/fixture/auth/Matrix.circom:Matrix");

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
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/auth/BasicInAuth.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("test/fixture/lib/BasicInLib.circom:Multiplier2"))();
    new (await circuitTypesGenerator.getCircuitObject("CredentialAtomicQueryMTPOnChainVoting"))();
    new (await circuitTypesGenerator.getCircuitObject("EnhancedMultiplier"))();

    await expect(circuitTypesGenerator.getCircuitObject("Multiplier3")).to.be.rejectedWith(
      "Circuit Multiplier3 type does not exist.",
    );
    await expect(circuitTypesGenerator.getCircuitObject("test/fixture/Basic.circom:Multiplier3")).to.be.rejectedWith(
      "Circuit Multiplier3 type does not exist.",
    );
  });

  it("should regenerate type if the circuit is updated", async () => {
    const initialFile = fs.readFileSync(
      "generated-types/circuits/core/auth/BasicInAuth.circom/Multiplier2.ts",
      "utf-8",
    );
    const initialFileHash = require("crypto").createHash("sha256").update(initialFile).digest("hex");

    fs.rmSync("test/cache/circuits-ast/auth/BasicInAuth.json", { recursive: true, force: true });
    fs.copyFileSync("test/mocks/BasicInAuth.json", "test/cache/circuits-ast/auth/BasicInAuth.json");

    await circuitTypesGenerator.generateTypes();

    const regeneratedFile = fs.readFileSync(
      "generated-types/circuits/core/auth/BasicInAuth.circom/Multiplier2.ts",
      "utf-8",
    );
    const regeneratedFileHash = require("crypto").createHash("sha256").update(regeneratedFile).digest("hex");

    expect(initialFileHash).to.not.equal(regeneratedFileHash);
  });
});
