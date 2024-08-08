import { ASTParserError } from "../errors";

export interface Result<T> {
  data: T;
  error: { message: string } | ASTParserError | null;
}
