import * as chevrotain from 'chevrotain';
import { Diagnostic, ParseError } from './errors';

/**
 * An implementation of chevrotain.IParserErrorMessageProvider that returns
 * JSON-encoded Diagnostic objects. This allows the other layers of the parser
 * to just decode the message and relay it to the user.
 */
export const errorMessageProvider = {
  buildMismatchTokenMessage: function (options: {
    actual: chevrotain.IToken;
    expected: chevrotain.TokenType;
    previous: chevrotain.IToken;
    ruleName: string;
  }): string {
    return JSON.stringify(<Diagnostic>{
      message: 'mismatched-token',
      location: {
        text: options.actual.image,
        line: options.actual.startLine,
        column: options.actual.startColumn,
        expected: [options.expected.LABEL ?? options.expected.name],
      },
    });
  },

  buildNoViableAltMessage: function (options: {
    actual: chevrotain.IToken[];
    customUserDescription: string;
    expectedPathsPerAlt: chevrotain.TokenType[][][];
    previous: chevrotain.IToken;
    ruleName: string;
  }): string {
    let allLookAheadPaths = (<chevrotain.TokenType[][]>[]).concat(
      ...options.expectedPathsPerAlt,
    );
    return JSON.stringify(<Diagnostic>{
      message: 'mismatched-token',
      location: {
        text: options.actual[0].image,
        line: options.actual[0].startLine,
        column: options.actual[0].startColumn,
        expected: allLookAheadPaths.map(
          (lookAheadPath) => lookAheadPath[0].LABEL ?? lookAheadPath[0].name,
        ),
      },
    });
  },

  buildNotAllInputParsedMessage: function (options: {
    firstRedundant: chevrotain.IToken;
    ruleName: string;
  }): string {
    return JSON.stringify(<Diagnostic>{
      message: 'expected-eof',
      location: {
        text: options.firstRedundant.image,
        line: options.firstRedundant.startLine,
        column: options.firstRedundant.startColumn,
        expected: [],
      },
    });
  },

  // This grammar has no AT_LEAST_ONE/AT_LEAST_ONE_SEP, so it should never be
  // encountered.
  buildEarlyExitMessage:
    chevrotain.defaultParserErrorProvider.buildEarlyExitMessage,
};

/**
 * A Karel opcode. An array consisting of the name of the opcode and up to two
 * optional parameters.
 */
export type Opcode =
  | [string]
  | [string, string | number]
  | [string, string | number, string | number];
export type LineOpcode = ['LINE', number];
export type CallOpcode = ['CALL', string, number];
export type ParamOpcode = ['PARAM', string | number];

/**
 * A Karel program, represented as a list of opcodes.
 */
export type Program = Opcode[];

/**
 * A Karel function definition / declaration.
 */
export interface FunctionDef {
  name: string;

  /**
   * The body of the function. Can be `null` if this is a declaration and not a
   * definition.
   */
  body: Program | null;

  /**
   * Number of parameters, plus one.
   */
  numParams: number;

  /**
   * The 1-based line where the function definition / declaration was found.
   */
  line: number;
}

/**
 * Perform the final linking step on a program. It first performs semantic
 * validation of the function declarations and calls, and then stitches
 * together all the function definitions, resolves calls, and ensures that all
 * parameters have been correctly resolved.
 *
 * @param functionList The list of function declaration / definitions.
 * @param program The contents of the main program entrypoint.
 * @param requireDeclaration Whether to require that functions are declared /
 * defined before being used.
 */
export function link(
  functionList: FunctionDef[],
  program: Program,
  requireDeclaration: boolean,
): Program {
  const functions: {
    [functionName: string]: {
      offset?: number;
      parameterCount: number;
    };
  } = {};
  const diagnostics: Diagnostic[] = [];

  for (const func of functionList) {
    if (!func.body) {
      if (functions[func.name]) {
        diagnostics.push({
          message: 'prototype-redefinition',
          location: {
            text: func.name,
            line: func.line,
          },
        });
        continue;
      }
      functions[func.name] = {
        parameterCount: func.numParams,
      };
      continue;
    }

    if (functions[func.name]) {
      if (typeof functions[func.name].offset !== 'undefined') {
        diagnostics.push({
          message: 'function-redefinition',
          location: {
            text: func.name,
            line: func.line,
          },
        });
        continue;
      } else if (functions[func.name].parameterCount !== func.numParams) {
        diagnostics.push({
          message: 'prototype-parameter-mismatch',
          location: {
            text: func.name,
            line: func.line,
          },
        });
        continue;
      }
    } else {
      functions[func.name] = {
        parameterCount: func.numParams,
      };
    }
    functions[func.name].offset = program.length;

    if (requireDeclaration) {
      // This is only to make sure that any function that is called has been
      // either declared or defined previously. Other validations will be done
      // in the overall program loop below.
      let currentLine = 1;
      for (const opcode of func.body) {
        if (opcode[0] == 'LINE') {
          currentLine = (<LineOpcode>opcode)[1] + 1;
        } else if (opcode[0] == 'CALL') {
          const callOpcode = <CallOpcode>opcode;
          if (!functions[callOpcode[1]]) {
            diagnostics.push({
              message: 'undefined-function',
              location: {
                text: callOpcode[1],
                line: currentLine,
              },
            });
            continue;
          }
        }
      }
    }

    program = program.concat(func.body);
  }

  let currentLine = 1;
  for (const opcode of program) {
    if (opcode[0] == 'LINE') {
      currentLine = (<LineOpcode>opcode)[1] + 1;
    } else if (opcode[0] == 'CALL') {
      const callOpcode = <CallOpcode>opcode;
      if (
        !functions[callOpcode[1]] ||
        typeof functions[callOpcode[1]].offset === 'undefined'
      ) {
        diagnostics.push({
          message: 'undefined-function',
          location: {
            text: callOpcode[1],
            line: currentLine,
          },
        });
        continue;
      }
      if (functions[callOpcode[1]].parameterCount != callOpcode[2]) {
        diagnostics.push({
          message: 'function-parameter-mismatch',
          location: {
            text: callOpcode[1],
            line: currentLine,
          },
        });
        continue;
      }

      opcode[2] = callOpcode[1];
      opcode[1] = functions[callOpcode[1]].offset;
    } else if (opcode[0] == 'PARAM' && typeof opcode[1] === 'string') {
      diagnostics.push({
        message: 'undefined-variable',
        location: {
          text: opcode[1],
          line: currentLine,
        },
      });
    }
  }

  if (diagnostics.length) {
    throw new ParseError('failed to parse', diagnostics);
  }

  return program;
}
