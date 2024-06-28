import CircuitProcessor from "./CircuitProcessor";

export async function generateAST(
  inputDir: string,
  outputDir: string,
  clean: boolean,
  skip: string[],
  only: string[],
): Promise<CircuitProcessor> {
  const preprocessor = new CircuitProcessor({
    defaultFolder: inputDir,
    astOutputDir: outputDir,
    clean,
    skip,
    only,
    strict: false,
    quiet: false,
  });

  await preprocessor.processCircuits();

  return preprocessor;
}
