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
   * The absolute path to the root directory of the project.
   */
  projectRoot: string;

  /**
   * The path to the directory where the generated artifacts will be stored.
   */
  outputArtifactsDir?: string;
}
