export enum SignalTypeNames {
  Input = "Input",
  Output = "Output",
  Intermediate = "Intermediate",
}

export enum SignalVisibilityNames {
  Public = "Public",
  Private = "Private",
}

export enum InternalType {
  BigInt = "<number-like>",
  BigIntArray = "<array-like>",
}

export enum Formats {
  V1HH_ZKIT_TYPE = "hh-zkit-artifacts-1",
}

export const DEFAULT_SIGNAL_NAMES_TYPE_LIMIT = 50000;
