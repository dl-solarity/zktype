import { SignalType } from "./ast";

export interface CircuitArtifact {
  _format: string;
  circuitName: string;
  sourceName: string;
  signals: Signal[];
}

export interface Signal {
  name: string;
  type: SignalType;
  internalType: string;
}
