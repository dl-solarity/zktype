import fs from "fs";
import path from "path";

import { expect, test, describe, afterEach } from "bun:test";

import CircuitTypesGenerator from "../src/core/CircuitTypesGenerator";
import CircuitArtifactGenerator from "../src/core/CircuitArtifactGenerator";

import { findProjectRoot } from "../src/utils";
import { defaultCircuitProcessorConfig } from "../src/config";

describe("Circuit Types Generation", function () {
  const expectedTypes = ["CredentialAtomicQueryMTPOnChainVoting.ts", "Multiplier2.ts"];

  const circuitTypesGenerator = new CircuitTypesGenerator();

  const artifactGenerator = new CircuitArtifactGenerator(
    { clean: false },
    {
      ...defaultCircuitProcessorConfig,
      defaultFolder: "test/fixture",
      skip: ["lib/BadBasicInLib.circom"],
    },
  );

  let projectRoot = findProjectRoot(__dirname);

  function getPathToGeneratedType(generatedTypePath: string) {
    return path.join(projectRoot, CircuitTypesGenerator.TYPES_DIR, generatedTypePath);
  }

  afterEach(async () => {
    const dirWithASTs = CircuitArtifactGenerator.ARTIFACTS_DIR;

    if (fs.existsSync(dirWithASTs)) {
      fs.rmSync(dirWithASTs, { recursive: true, force: true });
    }
  });

  test("it should generate Circuit Types based on the Artifacts", async () => {
    await artifactGenerator.generateCircuitArtifacts();

    await circuitTypesGenerator.generateTypes();

    for (const fileTypePath of expectedTypes) {
      const pathToCircuit = getPathToGeneratedType(fileTypePath);

      expect(fs.existsSync(pathToCircuit)).toBe(true);
    }
  });

  test("it should throw an error if the xtype of the initialization block is missing", async function () {
    fs.cpSync(
      "test/mocks/InvalidInternalType.json",
      `${CircuitArtifactGenerator.ARTIFACTS_DIR}/InvalidInternalType.json`,
    );

    expect(circuitTypesGenerator.generateTypes()).rejects.toThrow("Unsupported signal type: string");
  });
});
