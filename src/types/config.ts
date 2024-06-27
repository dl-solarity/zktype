export interface ZKTypeConfig extends ArtifactGeneratorConfig {
  /**
   * The path to the directory where the generated types will be stored.
   */
  outputTypesDir?: string;
}

export interface ArtifactGeneratorConfig {
  /**
   * The path to the directory where the circuit AST files are stored.
   */
  inputDir: string;

  /**
   * The path to the directory where the generated artifacts will be stored.
   */
  outputArtifactsDir?: string;

  /**
   * A flag indicating whether the artifacts should be cleaned up before generating new ones.
   * If set to `true`, the generator will delete all previously generated artifacts before generating new ones.
   * If set to `false`, the generator will keep the previously generated artifacts.
   */
  clean?: boolean;
}
