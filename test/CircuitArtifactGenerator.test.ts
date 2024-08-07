import fs from "fs";
import path from "path";

import { expect } from "chai";

import { generateAST } from "./helpers/generator";

import CircuitArtifactGenerator from "../src/core/CircuitArtifactGenerator";

import { findProjectRoot } from "../src/utils";
import { defaultCircuitArtifactGeneratorConfig } from "../src/config";

describe("Circuit Artifact Generation", function () {
  const expectedGeneratedArtifacts = [
    "Basic.json",
    "credentialAtomicQueryMTPV2OnChainVoting.json",
    "lib/BasicInLib.json",
    "auth/BasicInAuth.json",
  ];

  const inputDir = "test/fixture";
  const astDir = "test/cache/circuits-ast";
  const artifactGenerator = new CircuitArtifactGenerator({
    basePath: "test/fixture",
    projectRoot: findProjectRoot(process.cwd()),
    circuitsASTPaths: [
      "test/cache/circuits-ast/Basic.json",
      "test/cache/circuits-ast/credentialAtomicQueryMTPV2OnChainVoting.json",
      "test/cache/circuits-ast/lib/BasicInLib.json",
      "test/cache/circuits-ast/auth/EMultiplier.json",
      "test/cache/circuits-ast/auth/BasicInAuth.json",
    ],
    outputArtifactsDir: defaultCircuitArtifactGeneratorConfig.outputArtifactsDir,
  });

  function getPathToArtifact(artifactPath: string) {
    return path.join(artifactGenerator.getOutputArtifactsDir(), artifactPath);
  }

  beforeEach(async () => {
    await generateAST(inputDir, astDir, true, [], []);
  });

  afterEach(async () => {
    if (fs.existsSync(astDir)) {
      fs.rmSync(astDir, { recursive: true, force: true });
    }
  });

  it("should generate artifacts based on the AST files", async function () {
    await artifactGenerator.generateCircuitArtifacts();

    for (const artifactPath of expectedGeneratedArtifacts) {
      const pathToCircuit = getPathToArtifact(artifactPath);

      expect(fs.existsSync(pathToCircuit)).to.be.true;
    }
  });

  it("should throw an error if the compiler version field is missing", async function () {
    await expect(artifactGenerator.getCircuitArtifact("test/mocks/InvalidCompilerVersion.json")).to.be.rejectedWith(
      "The compiler version is missing in the circuit AST: test/fixture/InvalidCompilerVersion.circom",
    );
  });

  it("should return an error if the name in the initialization block is missing", async function () {
    const result = await artifactGenerator.getCircuitArtifact("test/mocks/InvalidInitializationBlockName.json");

    expect(result.error).to.be.equal(
      "The initializations field of initialization block is missing or incomplete in the circuit AST: test/fixture/InvalidInitializationBlockName.circom",
    );
  });

  it("should throw an error if the main component is missing", async function () {
    await expect(artifactGenerator.getCircuitArtifact("test/mocks/InvalidMainComponent.json")).to.be.rejectedWith(
      "The main component is missing or incomplete in the circuit AST: test/fixture/InvalidMainComponent.circom",
    );
  });

  it("should throw an error if the id of the main component is missing", async function () {
    await expect(artifactGenerator.getCircuitArtifact("test/mocks/InvalidMainComponentId.json")).to.be.rejectedWith(
      "The main component id is missing in the circuit AST: test/fixture/InvalidMainComponentId.circom",
    );
  });

  it("should return an error if the template block is missing", async function () {
    const result = await artifactGenerator.getCircuitArtifact("test/mocks/InvalidTemplateBlock.json");

    expect(result.error).to.be.equal("The template for the circuit Multiplier2 could not be found.");
  });

  it("should return an error if the xtype of the initialization block is missing", async function () {
    const result = await artifactGenerator.getCircuitArtifact("test/mocks/InvalidXTypeField.json");

    expect(result.error).to.be.equal(
      "The initialization block xtype is missing in the circuit AST: test/fixture/InvalidXTypeField.circom",
    );
  });
});
