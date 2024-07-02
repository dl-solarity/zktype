import { generateAST } from "./generator";

import CircuitTypesGenerator from "../../src/core/CircuitTypesGenerator";

const astDir = "test/cache/circuits-ast";

const circuitTypesGenerator = new CircuitTypesGenerator({
  basePath: "test/fixture",
  circuitsASTPaths: [
    "test/cache/circuits-ast/Basic.json",
    "test/cache/circuits-ast/credentialAtomicQueryMTPV2OnChainVoting.json",
    "test/cache/circuits-ast/lib/BasicInLib.json",
    "test/cache/circuits-ast/auth/EMultiplier.json",
    "test/cache/circuits-ast/auth/BasicInAuth.json",
  ],
});

async function generateTypes() {
  await generateAST("test/fixture", astDir, true, [], []);

  await circuitTypesGenerator.generateTypes();
}

generateTypes().catch(console.error);
