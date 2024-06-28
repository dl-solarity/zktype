import { generateAST } from "./generator";

import CircuitTypesGenerator from "../../src/core/CircuitTypesGenerator";

const astDir = "test/cache/circuits-ast";

const circuitTypesGenerator = new CircuitTypesGenerator({ inputDir: astDir });

async function generateTypes() {
  await generateAST("test/fixture", astDir, true, [], []);

  await circuitTypesGenerator.generateTypes();
}

generateTypes().catch(console.error);
