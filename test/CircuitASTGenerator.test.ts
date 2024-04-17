import fs from "fs";
import path from "path";

import { expect, test, describe } from "bun:test";

import CircuitASTGenerator from "../src/core/CircuitASTGenerator";

describe("Circuit AST Generation", function () {
  const compiler = new CircuitASTGenerator("test");

  test("it should compile the basic circuit", async function () {
    compiler.cleanupCircuitASTs();

    const pathToCircuit = require.resolve("./fixture/credentialAtomicQueryMTPOnChainVoting.circom");

    await compiler.generateCircuitAST(pathToCircuit);

    expect(
      fs.existsSync(
        path.join(
          compiler.projectRoot,
          CircuitASTGenerator.TEMP_DIR,
          "fixture/credentialAtomicQueryMTPOnChainVoting.json",
        ),
      ),
    ).toBe(true);
  });

  test("it should revert if trying to compile a non-existing circuit", async () => {
    expect(compiler.generateCircuitAST("fixture/Basic.circom")).rejects.toThrow(
      "The specified circuit file does not exist: fixture/Basic.circom",
    );
  });
});
