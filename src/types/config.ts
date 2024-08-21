export interface ZKTypeConfig {
  /**
   * The path to the directory where the generated types will be stored.
   */
  outputTypesDir?: string;

  /**
   * The base path to the root directory of the project where circuits are stored.
   */
  basePath: string;

  /**
   * An array of paths to all circuit artifacts.
   */
  circuitsArtifactsPaths: string[];

  /**
   * The absolute path to the root directory of the project.
   */
  projectRoot: string;
}
