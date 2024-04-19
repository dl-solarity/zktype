import { Command, Option } from "commander";

import { getPackageVersion } from "./utils";

import CircuitArtifactGenerator from "./core/CircuitArtifactGenerator";
import CircuitTypesGenerator from "./core/codegen/CircuitTypesGenerator";

export async function runCLI() {
  const program = new Command();

  program.version(getPackageVersion(), "-v, --version");

  program.addOption(
    new Option(
      "-p, --path <path>",
      "The path to the directory within the project root where the processor will search for circuits.",
    ).default("circuits"),
  );
  program.addOption(
    new Option(
      "-s, --skip <paterns...>",
      "An array of patterns specifying the paths to directories containing circuits or individual circuit files to be skipped when generating the circuit artifacts.",
    ).default([]),
  );
  program.addOption(
    new Option(
      "-o, --only <paterns...>",
      "An array of patterns specifying paths to directories containing circuits or to individual circuit files. The Circuit Processor will only search for circuits in these specified locations.",
    ).default([]),
  );
  program.addOption(
    new Option(
      "--strict-ast-generation",
      "A flag indicating whether the errors should immediately stop the processing of circuits or not.",
    ).default(false),
  );
  program.addOption(
    new Option(
      "--clean-ast-files",
      "A flag indicating whether the processor should clean up the previously generated circuit ASTs before processing the circuits.",
    ).default(false),
  );
  program.addOption(
    new Option(
      "--clean-artifacts",
      "A flag indicating whether the artifacts should be cleaned up before generating new ones.",
    ).default(false),
  );
  program.addOption(
    new Option(
      "--quiet",
      "A flag indicating whether the CircomASTGenerator should suppress circom errors or not.",
    ).default(false),
  );

  program.parse(process.argv);

  const options = program.opts();

  const artifactGenerator = new CircuitArtifactGenerator(
    {
      clean: options.artifactsClean,
    },
    {
      defaultFolder: options.config,
      skip: options.skip,
      only: options.only,
      strict: options.strictAstGeneration,
      clean: options.astClean,
      quiet: options.quiet,
    },
  );

  await artifactGenerator.generateCircuitArtifacts();

  const typesGenerator = new CircuitTypesGenerator(options.config);

  await typesGenerator.generateTypes();
}
