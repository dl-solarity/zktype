export interface ZKTypeConfig extends ArtifactGeneratorConfig {
  /**
   * The path to the directory where the generated types will be stored.
   */
  outputTypesDir?: string;
}

export interface ArtifactGeneratorConfig {
  /**
   * The base path to the root directory of the project where circuits are stored.
   */
  basePath: string;

  /**
   * An array of paths to the circuits' AST files.
   */
  circuitsASTPaths: string[];

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
