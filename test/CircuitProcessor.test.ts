import fs from "fs";
import path from "path";

import { expect, test, describe } from "bun:test";

import { findProjectRoot } from "../src/utils";

import CircuitProcessor from "../src/CircuitProcessor";
import CircuitASTGenerator from "../src/CircuitASTGenerator";
import { defaultCircuitProcessorConfig } from "../src/config";

describe("Circuit Processor", function () {
  const validCircuitPaths = [
    "fixture/Basic.circom",
    "fixture/credentialAtomicQueryMTPOnChainVoting.circom",
    "fixture/lib/BasicInLib.circom",
    "fixture/auth/BasicInAuth.circom",
  ];

  const corruptCircuitPaths = ["fixture/lib/BadBasicInLib.circom"];

  let projectRoot = findProjectRoot(__dirname);

  function getPathToCircuit(circuitPath: string) {
    return path.join(
      projectRoot,
      CircuitASTGenerator.TEMP_DIR,
      circuitPath.replace(".circom", ".json").replace("fixture/", ""),
    );
  }

  test("it should process folder with circuits", async () => {
    const processor = new CircuitProcessor({ ...defaultCircuitProcessorConfig, defaultFolder: "test/fixture" });

    await processor.processCircuits();

    for (const circuitPath of validCircuitPaths) {
      const pathToCircuit = getPathToCircuit(circuitPath);

      expect(fs.existsSync(pathToCircuit)).toBe(true);
    }

    for (const circuitPath of corruptCircuitPaths) {
      const pathToCircuit = getPathToCircuit(circuitPath);

      expect(fs.existsSync(pathToCircuit)).toBe(false);
    }
  });

  test("is should process only specified circuits", async () => {
    const processor = new CircuitProcessor({
      ...defaultCircuitProcessorConfig,
      defaultFolder: "test/fixture",
      only: ["lib/BasicInLib.circom"],
    });

    await processor.processCircuits();

    for (const circuitPath of validCircuitPaths) {
      const pathToCircuit = getPathToCircuit(circuitPath);

      if (circuitPath.includes("lib/BasicInLib.circom")) {
        expect(fs.existsSync(pathToCircuit)).toBe(true);
      } else {
        expect(fs.existsSync(pathToCircuit)).toBe(false);
      }
    }
  });

  test("is should skip specified circuits (skip should have higher priority than only)", async () => {
    const processor = new CircuitProcessor({
      ...defaultCircuitProcessorConfig,
      defaultFolder: "test/fixture",
      only: ["lib/BasicInLib.circom", "auth/BasicInAuth.circom"],
      skip: ["lib/BasicInLib.circom"],
    });

    await processor.processCircuits();

    for (const circuitPath of validCircuitPaths) {
      const pathToCircuit = getPathToCircuit(circuitPath);

      if (circuitPath.includes("auth/BasicInAuth.circom")) {
        expect(fs.existsSync(pathToCircuit)).toBe(true);
      } else {
        expect(fs.existsSync(pathToCircuit)).toBe(false);
      }
    }
  });

  test("should throw an error if AST generating fails and strict is true", async () => {
    const processor = new CircuitProcessor({
      ...defaultCircuitProcessorConfig,
      defaultFolder: "test/fixture",
      strict: true,
    });

    expect(processor.processCircuits()).rejects.toThrow(
      `An error occurred while processing the circuit: ${corruptCircuitPaths[0].replace("fixture/", "")}`,
    );
  });

  test("should clean up previously generated circuit ASTs before processing the circuits if clean is true", async () => {
    const processor = new CircuitProcessor({
      ...defaultCircuitProcessorConfig,
      defaultFolder: "test/fixture",
      skip: [".*"],
    });

    await processor.processCircuits();

    for (const circuitPath of validCircuitPaths) {
      const pathToCircuit = getPathToCircuit(circuitPath);

      expect(fs.existsSync(pathToCircuit)).toBe(false);
    }
  });
});
