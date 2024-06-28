# Changelog

## [v0.2.0]

- Resolved an issue where arrays might have multiple dimensions, such as `bigint[][][]`.
- Refactored architecture to work as a library
    - Deleted support for standalone run
    - Added ability to specify where the circuit's AST files are stored
    - Added ability to specify where to put generated artifacts and types
- Implemented Zkit wrapper generation for given circuits
- Used ejs instead of ts factory to render the wrapper class

## [v0.1.1]

### Added

- Initial release of the ZKType package
- Support for generating TypeScript bindings for Circom circuits

