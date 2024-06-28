import fs from "fs";
import path from "path";

import { expect } from "chai";

import { generateAST } from "./helpers/generator";

import { findProjectRoot } from "../src/utils";

import CircuitTypesGenerator from "../src/core/codegen/CircuitTypesGenerator";

describe("Circuit Types Generation", function () {
  const expectedTypes = ["core/CredentialAtomicQueryMTPOnChainVoting.ts", "core/Multiplier2.ts"];

  let projectRoot = findProjectRoot(__dirname);

  const astDir = "test/cache/circuits-ast";

  const circuitTypesGenerator = new CircuitTypesGenerator({ inputDir: astDir });

  function getPathToGeneratedType(generatedTypePath: string) {
    return path.join(projectRoot, circuitTypesGenerator.getOutputTypesDir(), generatedTypePath);
  }

  beforeEach(async () => {
    await generateAST("test/fixture", astDir, true, [], []);
  });

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
