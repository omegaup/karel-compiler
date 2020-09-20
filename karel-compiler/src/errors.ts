enum DiagnosticLevel {
  //
  Warning,
  Error,
}

interface LocationInformation {
  // The text of the token.
  text: string;

  // 1-based line number.
  line?: number;

  // 1-based column number.
  column?: number;

  // List of expected tokens.
  expected?: string[];
}

export interface Diagnostic {
  // An error message that can be presented to the user.
  message: string;

  // The information of the location where the parse error occurred.
  location?: LocationInformation;
}

export class ParseError extends Error {
  // The list of error diagnostics.
  public diagnostics: Diagnostic[];

  public constructor(message: string, diagnostics: Diagnostic[]) {
    super(message);
    Object.setPrototypeOf(this, ParseError.prototype);
    this.diagnostics = diagnostics;
  }

  public format(source: string, filename?: string): void {
    if (!this.diagnostics) {
      return;
    }
    const lines = source.split('\n');
    const messageChunks: string[] = [this.message];

    for (const diagnostic of this.diagnostics) {
      const locationChunks = [filename ?? '<source>'];
      if (typeof diagnostic?.location?.line !== 'undefined') {
        locationChunks.push(diagnostic.location.line.toString());
        if (typeof diagnostic.location?.column !== 'undefined') {
          locationChunks.push(diagnostic.location.column.toString());
        }
      }
      messageChunks.push(`${locationChunks.join(':')}: ${diagnostic.message}`);
      if (
        typeof diagnostic?.location?.line === 'undefined' ||
        lines.length <= diagnostic.location.line - 1
      ) {
        messageChunks.push('');
        continue;
      }
      const linePrefix = `${diagnostic.location.line.toString().padStart(3)}: `;
      messageChunks.push(`${linePrefix}${lines[diagnostic.location.line - 1]}`);
      if (
        typeof diagnostic?.location?.column !== 'undefined' &&
        typeof diagnostic?.location?.text !== 'undefined'
      ) {
        messageChunks.push(
          `${''.padStart(
            linePrefix.length + diagnostic.location.column - 1,
          )}${''.padStart(diagnostic.location.text.length, '^')}`,
        );
      }
      if (typeof diagnostic?.location?.expected !== 'undefined') {
        messageChunks.push(
          `Expected one of ${diagnostic.location.expected
            .map((expected) => '"' + expected + '"')
            .join(', ')}`,
        );
      }
      messageChunks.push('');
    }

    this.message = messageChunks.join('\n');
  }
}
