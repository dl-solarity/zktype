[![npm](https://img.shields.io/npm/v/@solarity/zktype.svg)](https://www.npmjs.com/package/@solarity/zktype)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# ZKType - TypeScript bindings for Circom circuits

**ZKType simplifies and makes user-friendly the process of working with Circom circuits.**

- Generate a [zkit](https://github.com/dl-solarity/zkit) wrapper for given circuits.
- Ensure that all inputs and proofs are correctly formatted.

## Installation

To install the package, run:

```bash
npm install --save-dev @solarity/zktype
```

## Usage

> [!IMPORTANT]
> ZKType is not meant to be used directly as its fitness relies heavily on the environment, e.g., on Circom compilation artifacts management. Consider using [hardhat-zkit](https://github.com/dl-solarity/hardhat-zkit), which is a complete, developer-friendly package.

### CircuitTypesGenerator

`CircuitTypesGenerator` is an entry point for generating TypeScript bindings for a given circuit.

To create a `CircuitTypesGenerator` object, it is necessary to pass a config:

```typescript
ZKTypeConfig = {
  basePath: string;
  projectRoot: string;
  circuitsASTPaths: string[];
  outputTypesDir?: string;
};
```

This config contains all the information required to generate TypeScript bindings for given circuits.

- `basePath` - Path to the root directory of the project where circuits are stored.
- `projectRoot` - Absolute path to the root directory of the project.
- `circuitsArtifactsPaths` - Array of paths to the circuits' Artifact files.
- `outputTypesDir` - Path to the directory where the generated types will be stored.
    - Optional. Default: `generated-types/circuits`.

#### generateTypes()

Generates TypeScript bindings for the given circuits, based on the provided config.

```typescript
const generator = new CircuitTypesGenerator(config);
await generator.generateTypes();
```

Also, this function generates the `hardhat.d.ts` file, where you can find all of the possible objects that can be retrieved by the function below.

#### getCircuitObject(circuitName: string): Promise<any>

Returns the constructible object for the given circuit.

```typescript
const generator = new CircuitTypesGenerator(config);
await generator.generateTypes();
const circuitObject = await generator.getCircuitObject("MyCircuit");
```

After the `circuitObject` is retrieved, check out the [zkit](https://github.com/dl-solarity/zkit) documentation to see how to work with it.

To ensure that the object can be imported, check the `hardhat.d.ts` file.
