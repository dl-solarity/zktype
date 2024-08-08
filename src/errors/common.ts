import { ASTParserError } from "./ParseError";

export type ErrorObj = { message: string } | ASTParserError | null;
