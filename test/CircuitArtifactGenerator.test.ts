import fs from "fs";
import path from "path";

import { expect, test, describe, afterEach } from "bun:test";

import CircuitASTGenerator from "../src/core/CircuitASTGenerator";
import CircuitArtifactGenerator from "../src/core/CircuitArtifactGenerator";

import { findProjectRoot } from "../src/utils";
import { defaultCircuitArtifactGeneratorConfig, defaultCircuitProcessorConfig } from "../src/config";

describe("Circuit Artifact Generation", function () {
  const expectedGeneratedArtifacts = [
    "Basic.json",
    "credentialAtomicQueryMTPOnChainVoting.json",
    "lib/BasicInLib.json",
    "auth/BasicInAuth.json",
  ];

  let projectRoot = findProjectRoot(__dirname);

  const artifactGenerator = new CircuitArtifactGenerator(defaultCircuitArtifactGeneratorConfig, {
    ...defaultCircuitProcessorConfig,
    defaultFolder: "test/fixture",
    skip: ["lib/BadBasicInLib.circom"],
    clean: false,
  });

  function getPathToArtifact(artifactPath: string) {
    return path.join(projectRoot, CircuitArtifactGenerator.ARTIFACTS_DIR, artifactPath);
  }

  afterEach(async () => {
    const dirWithASTs = CircuitASTGenerator.TEMP_DIR;

    if (fs.existsSync(dirWithASTs)) {
      fs.rmSync(dirWithASTs, { recursive: true, force: true });
    }
  });

  test("it should generate artifacts based on the AST files", async function () {
    await artifactGenerator.generateCircuitArtifacts();

    for (const artifactPath of expectedGeneratedArtifacts) {
      const pathToCircuit = getPathToArtifact(artifactPath);

      expect(fs.existsSync(pathToCircuit)).toBe(true);
    }
  });

  test("it should throw an error if the compiler version field is missing", async function () {
    fs.cpSync("test/mocks/InvalidCompilerVersion.json", `${CircuitASTGenerator.TEMP_DIR}/InvalidCompilerVersion.json`);

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The compiler version is missing in the circuit AST: test/fixture/InvalidCompilerVersion.circom",
    );
  });

  test("it should throw an error if the name in the initialization block is missing", async function () {
    fs.cpSync(
      "test/mocks/InvalidInitializationBlockName.json",
      `${CircuitASTGenerator.TEMP_DIR}/InvalidInitializationBlockName.json`,
    );

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The initializations field of initialization block is missing or incomplete in the circuit AST: test/fixture/InvalidInitializationBlockName.circom",
    );
  });

  test("it should throw an error if the main component is missing", async function () {
    fs.cpSync("test/mocks/InvalidMainComponent.json", `${CircuitASTGenerator.TEMP_DIR}/InvalidMainComponent.json`);

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The main component is missing or incomplete in the circuit AST: test/fixture/InvalidMainComponent.circom",
    );
  });

  test("it should throw an error if the id of the main component is missing", async function () {
    fs.cpSync("test/mocks/InvalidMainComponentId.json", `${CircuitASTGenerator.TEMP_DIR}/InvalidMainComponentId.json`);

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The main component id is missing in the circuit AST: test/fixture/InvalidMainComponentId.circom",
    );
  });

  test("it should throw an error if the template block is missing", async function () {
    fs.cpSync("test/mocks/InvalidTemplateBlock.json", `${CircuitASTGenerator.TEMP_DIR}/InvalidTemplateBlock.json`);

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The template is missing or incomplete in the circuit AST: test/fixture/InvalidTemplateBlock.circom",
    );
  });

  test("it should throw an error if the xtype of the initialization block is missing", async function () {
    fs.cpSync("test/mocks/InvalidXTypeField.json", `${CircuitASTGenerator.TEMP_DIR}/InvalidXTypeField.json`);

    expect(artifactGenerator.generateCircuitArtifacts()).rejects.toThrow(
      "The initialization block xtype is missing in the circuit AST: test/fixture/InvalidXTypeField.circom",
    );
  });
});
