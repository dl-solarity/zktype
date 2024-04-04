import fs from "fs";
import path from "path";

import { expect, test, describe } from "bun:test";

import CircuitASTGenerator from "../src/CircuitASTGenerator";

describe("Circuit AST Generation", function () {
  const compiler = new CircuitASTGenerator();

  test("it should compile the basic circuit", async function () {
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

  test("it should revert if trying yo compile a non-existing circuit", async () => {
    expect(compiler.generateCircuitAST("fixture/Basic.circom")).rejects.toThrow(
      "The specified circuit file does not exist: fixture/Basic.circom",
    );
  });
});
