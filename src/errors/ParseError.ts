export interface ASTParserErrorDetails {
  circuitFullNames: string;
  message: string;
  context: any;
}

export class ASTParserError extends Error {
  public error: ASTParserErrorDetails;

  constructor(fullName: string, message: string, context: any) {
    super();
    this.message = message;
    this.error = {
      circuitFullNames: fullName,
      message,
      context,
    };
  }
}
