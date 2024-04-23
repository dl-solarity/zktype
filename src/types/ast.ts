// Helper types

export type SignalType = "Output" | "Input" | "Intermediate";

export type SignalVisibility = "public" | "private";

export interface CircuitAST {
  sourcePath: string;
  circomCompilerOutput: CircomCompilerOutput[];
}

// Compiler and Definitions

export interface CircomCompilerOutput {
  meta: Meta;
  compiler_version: number[];
  custom_gates: boolean;
  custom_gates_declared: boolean;
  includes: string[];
  definitions: Definition[];
  main_component?: MainComponent;
}

export type MainComponent = [string[], Call];

export interface Call {
  Call: {
    meta: Meta;
    id: string;
    args: any[];
  };
}

export type Definition = {
  Template?: Template;
};

export interface Template {
  meta: Meta;
  name: string;
  args: string[];
  arg_location: Location;
  body: Body;
  parallel: boolean;
  is_custom_gate: boolean;
}

export interface Body {
  Block: Block;
}

export interface Block {
  meta: Meta;
  stmts: Stmt[];
}

export type Stmt = {
  InitializationBlock?: InitializationBlock;
  Substitution?: Substitution;
};

export interface InitializationBlock {
  meta: Meta;
  xtype: XType;
  initializations: Initialization[];
}

export type Initialization = {
  Declaration: Declaration;
};

export interface Declaration {
  meta: Meta;
  xtype: XType;
  name: string;
  dimensions: any[];
  is_constant: boolean;
}

export interface Substitution {
  meta: Meta;
  var: string;
  access: any[];
  op: string;
  rhe: Rhe;
}

export interface Rhe {
  InfixOp: InfixOp;
}

export interface InfixOp {
  meta: Meta;
  lhe: Variable;
  infix_op: string;
  rhe: Variable;
}

export interface Variable {
  meta: Meta;
  name: string;
  access: any[];
}

export type XType = {
  Signal: [string, any[]];
};

// Base Types

export interface Meta {
  elem_id: number;
  start: number;
  end: number;
  location: Location;
  file_id?: string;
  component_inference?: string;
  type_knowledge: TypeKnowledge;
  memory_knowledge: MemoryKnowledge;
}

export interface Location {
  start: number;
  end: number;
}

export interface TypeKnowledge {
  reduces_to?: string;
}

export interface MemoryKnowledge {
  concrete_dimensions?: string;
  full_length?: string;
  abstract_memory_address?: string;
}
