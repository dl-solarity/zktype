[![npm](https://img.shields.io/npm/v/@solarity/zktype.svg)](https://www.npmjs.com/package/@solarity/zktype) 

# ZKType 

ZKType - unleash TypeScript bindings for Circom circuits.

## Installation

To install the package, run:

```bash
npm install --save-dev @solarity/zktype
```

## Usage

If all of your circuits are in the `circuits` folder, simply run the following command to generate TypeScript bindings 
for the Circom circuits:

```bash
npx zktype
```

By default, the script will look for circuits inside the `circuits` folder. If you wish to specify another folder 
to look for circuits, you can use the following command:

```bash
npx zktype --path ./src 
```

or simply:

```bash
npx zktype -p ./src 
```

To learn more about available commands, run:

```bash 
npx zktype --help 
```

## How it works

Under the hood, ZKType uses the `@distributedlab/circom2` package, which contains a WASM-compiled Circom compiler. 
It uses this compiler to extract ASTs from all the circuits, generate artifacts, and then generate types based on these artifacts.

## Known limitations

* Currently, after each run, all circuits will be recompiled without checking if a circuit has changed or not.
