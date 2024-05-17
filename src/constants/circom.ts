export enum SignalTypeNames {
  Input = "Input",
  Output = "Output",
  Intermediate = "Intermediate",
}

export enum SignalVisibilityNames {
  Public = "public",
  Private = "private",
}

// FIXME: Array could have any number of dimensions (e.g. bigint[2][3][4]...)
export enum InternalType {
  BigInt = "bigint",
  BigIntArray = "bigint[]",
}
