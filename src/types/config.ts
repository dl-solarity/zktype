/**
 * Configuration options for the Circuit Processor.
 */
export interface CircuitProcessorConfig {
  /**
   * The path to the directory within the project root where the processor will search for circuits.
   * If the directory does not exist, an error will be thrown when there is an attempt to generate circuit types (or artifacts).
   * If the directory is empty, a relevant message will be displayed.
   */
  defaultFolder: string;

  /**
   * An array of patterns specifying the paths to directories containing circuits or individual circuit files to be skipped
   * when generating the circuit artifacts.
   *
   * Must be valid regular expressions!
   */
  skip: string[];

  /**
   * An array of patterns specifying paths to directories containing circuits or to individual circuit files. The Circuit Processor
   * will only search for circuits in these specified locations.
   *
   * Must be valid regular expressions!
   *
   * The `skip` option has higher priority than the `only` option.
   */
  only: string[];

  /**
   * A flag indicating whether the errors should immediately stop the processing of circuits or not.
   * If set to `true`, the processor will stop processing circuits when an error is encountered.
   * If set to `false`, the processor will log the error and continue processing the remaining circuits.
   */
  strict: boolean;

  /**
   * A flag indicating whether the processor should clean up the previously generated circuit ASTs before processing the circuits.
   * If set to `true`, the processor will delete all previously generated circuit ASTs before processing the circuits.
   * If set to `false`, the processor will keep the previously generated circuit ASTs.
   */
  clean: boolean;
}
