import { generateAST } from "./generator";

import { CircuitTypesGenerator } from "../../src";

import { findProjectRoot } from "../../src/utils";

const astDir = "test/cache/circuits-ast";

const circuitTypesGenerator = new CircuitTypesGenerator({
  basePath: "test/fixture",
  projectRoot: findProjectRoot(process.cwd()),
  circuitsASTPaths: [
    "test/cache/circuits-ast/Basic.json",
    "test/cache/circuits-ast/credentialAtomicQueryMTPV2OnChainVoting.json",
    "test/cache/circuits-ast/lib/BasicInLib.json",
    "test/cache/circuits-ast/auth/EMultiplier.json",
    "test/cache/circuits-ast/auth/BasicInAuth.json",
    "test/cache/circuits-ast/auth/Matrix.json",
  ],
});

async function generateTypes() {
  await generateAST("test/fixture", astDir, true, [], []);

  await circuitTypesGenerator.generateTypes();
}

generateTypes().catch(console.error);
