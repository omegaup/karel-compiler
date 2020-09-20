import * as chevrotain from 'chevrotain';
import { Diagnostic, ParseError } from './errors';
import {
  errorMessageProvider,
  Opcode,
  LineOpcode,
  CallOpcode,
  ParamOpcode,
  Program,
  FunctionDef,
  link,
} from './parser';

// Lexer token definitions.

const Identifier = chevrotain.createToken({
  name: 'Identifier',
  pattern: /[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*/,
  label: '<var>',
});

const Whitespace = chevrotain.createToken({
  name: 'Whitespace',
  pattern: /\s+/,
  group: chevrotain.Lexer.SKIPPED,
});
const LineComment = chevrotain.createToken({
  name: 'LineComment',
  pattern: /\{[^}]*\}/,
  group: 'comments',
});
const BlockComment = chevrotain.createToken({
  name: 'BlockComment',
  pattern: /\(\*(?:[^*]|\*(?!\)))*\*\)/,
  group: 'comments',
});

function keyword(
  name: string,
  pattern: RegExp,
  label?: string,
): chevrotain.TokenType {
  const config: chevrotain.ITokenConfig = {
    name: name,
    pattern: pattern,
    longer_alt: Identifier,
  };
  if (label) {
    config.label = label;
  }
  return chevrotain.createToken(config);
}

const BeginProgram = keyword(
  'BeginProgram',
  /iniciar-programa/,
  'iniciar-programa',
);
const BeginExecution = keyword(
  'BeginExecution',
  /inicia-ejecuci[oó]n/,
  'inicia-ejecución',
);
const EndExecution = keyword(
  'EndExecution',
  /termina-ejecuci[oó]n/,
  'termina-ejecución',
);
const EndProgram = keyword(
  'EndProgram',
  /finalizar-programa/,
  'finalizar-programa',
);
const Define = keyword(
  'Define',
  /define-nueva-instrucci[oó]n/,
  'define-nueva-instrucción',
);
const Proto = keyword(
  'Proto',
  /define-prototipo-instrucci[oó]n/,
  'define-prototipo-instrucción',
);
const Return = keyword('Return', /sal-de-instrucci[oó]n/, 'sal-de-instrucción');
const As = keyword('As', /como/, 'como');
const TurnOff = keyword('TurnOff', /ap[aá]gate/, 'apágate');
const TurnLeft = keyword('TurnLeft', /gira-izquierda/, 'gira-izquierda');
const Forward = keyword('Forward', /avanza/, 'avanza');
const PickBeeper = keyword('PickBeeper', /coge-zumbador/, 'coge-zumbador');
const PutBeeper = keyword('PutBeeper', /deja-zumbador/, 'deja-zumbador');
const Begin = keyword('Begin', /inicio/, 'inicio');
const End = keyword('End', /fin/, 'fin');
const Then = keyword('Then', /entonces/, 'entonces');
const While = keyword('While', /mientras/, 'mientras');
const Do = keyword('Do', /hacer/, 'hacer');
const Repeat = keyword('Repeat', /repetir/, 'repetir');
const Times = keyword('Times', /veces/, 'veces');
const Pred = keyword('Pred', /precede/, 'precede');
const Succ = keyword('Succ', /sucede/, 'sucede');
const IsZero = keyword('IsZero', /si-es-cero/, 'si-es-cero');
const FrontIsClear = keyword('FrontIsClear', /frente-libre/, 'frente-libre');
const FrontIsBlocked = keyword(
  'FrontIsBlocked',
  /frente-bloqueado/,
  'frente-bloqueado',
);
const LeftIsClear = keyword(
  'LeftIsClear',
  /izquierda-libre/,
  'izquierda-libre',
);
const LeftIsBlocked = keyword(
  'LeftIsBlocked',
  /izquierda-bloqueada/,
  'izquierda-bloqueada',
);
const RightIsClear = keyword('RightIsClear', /derecha-libre/, 'derecha-libre');
const RightIsBlocked = keyword(
  'RightIsBlocked',
  /derecha-bloqueada/,
  'derecha-bloqueada',
);
const NextToABeeper = keyword(
  'NextToABeeper',
  /junto-a-zumbador/,
  'junto-a-zumbador',
);
const NotNextToABeeper = keyword(
  'NotNextToABeeper',
  /no-junto-a-zumbador/,
  'no-junto-a-zumbador',
);
const AnyBeepersInBeeperBag = keyword(
  'AnyBeepersInBeeperBag',
  /alg[uú]n-zumbador-en-la-mochila/,
  'algún-zumbador-en-la-mochila',
);
const NoBeepersInBeeperBag = keyword(
  'NoBeepersInBeeperBag',
  /ning[uú]n-zumbador-en-la-mochila/,
  'ningún-zumbador-en-la-mochila',
);
const FacingNorth = keyword(
  'FacingNorth',
  /orientado-al-norte/,
  'orientado-al-norte',
);
const FacingSouth = keyword(
  'FacingSouth',
  /orientado-al-sur/,
  'orientado-al-sur',
);
const FacingEast = keyword(
  'FacingEast',
  /orientado-al-este/,
  'orientado-al-este',
);
const FacingWest = keyword(
  'FacingWest',
  /orientado-al-oeste/,
  'orientado-al-oeste',
);
const NotFacingNorth = keyword(
  'NotFacingNorth',
  /no-orientado-al-norte/,
  'no-orientado-al-norte',
);
const NotFacingSouth = keyword(
  'NotFacingSouth',
  /no-orientado-al-sur/,
  'no-orientado-al-sur',
);
const NotFacingEast = keyword(
  'NotFacingEast',
  /no-orientado-al-este/,
  'no-orientado-al-este',
);
const NotFacingWest = keyword(
  'NotFacingWest',
  /no-orientado-al-oeste/,
  'no-orientado-al-oeste',
);
const Else = keyword('Else', /si-?no/, 'si-no');
const If = keyword('If', /si/, 'si');
const Not = keyword('Not', /no/, 'no');
const Or = keyword('Or', /[ou]/, 'o');
const And = keyword('And', /[ye]/, 'y');
const LeftParen = keyword('LeftParen', /\(/, '(');
const RightParen = keyword('RightParen', /\)/, ')');
const Semicolon = keyword('Semicolon', /;/, ';');
const IntegerLiteral = chevrotain.createToken({
  name: 'IntegerLiteral',
  pattern: /\d+/,
  label: '<int>',
});

// The old Pascal parser enabled the `lex` option for parsing. The intention
// was to always match the longest possible token, but it also triggered a
// bug where unrecognized characters would be printed to stdout and ignored.
//
// This made the old parser a lot more lax than it should have, but now we
// need to live with that :/
const Garbage = chevrotain.createToken({
  name: 'Garbage',
  pattern: /./,
  group: chevrotain.Lexer.SKIPPED,
});

const allTokens = [
  Whitespace,

  // Keywords.
  BeginProgram,
  BeginExecution,
  EndExecution,
  EndProgram,
  Define,
  Proto,
  Return,
  As,
  TurnOff,
  TurnLeft,
  Forward,
  PickBeeper,
  PutBeeper,
  Begin,
  End,
  Then,
  While,
  Do,
  Repeat,
  Times,
  Pred,
  Succ,
  IsZero,
  FrontIsClear,
  FrontIsBlocked,
  LeftIsClear,
  LeftIsBlocked,
  RightIsClear,
  RightIsBlocked,
  NextToABeeper,
  NotNextToABeeper,
  AnyBeepersInBeeperBag,
  NoBeepersInBeeperBag,
  FacingNorth,
  FacingSouth,
  FacingEast,
  FacingWest,
  NotFacingNorth,
  NotFacingSouth,
  NotFacingEast,
  NotFacingWest,
  Else,
  If,
  Not,
  Or,
  And,

  IntegerLiteral,
  Identifier,

  LineComment,
  BlockComment,

  LeftParen,
  RightParen,
  Semicolon,

  // This rule should be the very last one, since it will eat _any_ character.
  Garbage,
];

const lexerInstance = new chevrotain.Lexer(allTokens);

const tokenVocabulary: { [key: string]: chevrotain.TokenType } = {};
allTokens.forEach((tokenType) => {
  tokenVocabulary[tokenType.name] = tokenType;
});

// Given that we have globally enabled recovery in the parser, we need to
// disable that in all productions _except_ the ones that have an optional
// trailing semicolon.
const disableResyncOptions = {
  resyncEnabled: false,
};

class Parser extends chevrotain.CstParser {
  constructor() {
    super(tokenVocabulary, {
      errorMessageProvider: errorMessageProvider,
      recoveryEnabled: true,
    });

    this.performSelfAnalysis();
  }

  public program = this.RULE(
    'program',
    () => {
      this.CONSUME(BeginProgram);
      this.MANY(() => {
        this.SUBRULE(this.defOrProto);
      });
      this.SUBRULE(this.programDef);
      this.CONSUME(EndProgram);
    },
    disableResyncOptions,
  );

  public programDef = this.RULE(
    'programDef',
    () => {
      this.CONSUME(BeginExecution);
      this.MANY(() => {
        this.SUBRULE(this.statement);
      });
      this.CONSUME(EndExecution);
    },
    disableResyncOptions,
  );

  public block = this.RULE(
    'block',
    () => {
      this.CONSUME(Begin);
      this.MANY(() => {
        this.SUBRULE(this.statement);
      });
      this.CONSUME(End);
    },
    disableResyncOptions,
  );

  public defOrProto = this.RULE(
    'defOrProto',
    () => {
      this.OR([
        {
          ALT: () => {
            this.SUBRULE(this.def);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.proto);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public proto = this.RULE(
    'proto',
    () => {
      this.CONSUME(Proto);
      this.CONSUME(Identifier);
      this.OPTION(() => {
        this.SUBRULE(this.defParam);
      });
      this.CONSUME(Semicolon);
    },
    disableResyncOptions,
  );

  public def = this.RULE(
    'def',
    () => {
      this.CONSUME(Define);
      this.CONSUME(Identifier);
      this.OPTION(() => {
        this.SUBRULE(this.defParam);
      });
      this.CONSUME(As);
      this.SUBRULE(this.statement);
    },
    disableResyncOptions,
  );

  public defParam = this.RULE(
    'defParam',
    () => {
      this.CONSUME(LeftParen);
      this.OPTION(() => {
        this.CONSUME(Identifier);
      });
      this.CONSUME(RightParen);
    },
    disableResyncOptions,
  );

  public statement = this.RULE(
    'statement',
    () => {
      this.OPTION(() => {
        this.SUBRULE(this.singleStatement);
      });
      this.CONSUME(Semicolon);
    },
    disableResyncOptions,
  );

  public singleStatement = this.RULE(
    'singleStatement',
    () => {
      this.OR([
        {
          ALT: () => {
            this.SUBRULE(this.statementFun);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.call);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.cond);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.loop);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.repeat);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.block);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public statementFun = this.RULE(
    'statementFun',
    () => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Forward);
          },
        },
        {
          ALT: () => {
            this.CONSUME(TurnLeft);
          },
        },
        {
          ALT: () => {
            this.CONSUME(PickBeeper);
          },
        },
        {
          ALT: () => {
            this.CONSUME(PutBeeper);
          },
        },
        {
          ALT: () => {
            this.CONSUME(TurnOff);
          },
        },
        {
          ALT: () => {
            this.CONSUME(Return);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public call = this.RULE(
    'call',
    () => {
      this.CONSUME(Identifier);
      this.OPTION(() => {
        this.CONSUME(LeftParen);
        this.SUBRULE(this.integer);
        this.CONSUME(RightParen);
      });
    },
    disableResyncOptions,
  );

  public cond = this.RULE(
    'cond',
    () => {
      this.CONSUME(If);
      this.SUBRULE(this.term);
      this.CONSUME(Then);
      this.SUBRULE(this.singleStatement);
      this.OPTION(() => {
        this.CONSUME(Else);
        this.SUBRULE2(this.singleStatement);
      });
    },
    disableResyncOptions,
  );

  public loop = this.RULE(
    'loop',
    () => {
      this.CONSUME(While);
      this.SUBRULE(this.term);
      this.CONSUME(Do);
      this.SUBRULE(this.singleStatement);
    },
    disableResyncOptions,
  );

  public repeat = this.RULE(
    'repeat',
    () => {
      this.CONSUME(Repeat);
      this.SUBRULE(this.integer);
      this.CONSUME(Times);
      this.SUBRULE(this.singleStatement);
    },
    disableResyncOptions,
  );

  public term = this.RULE(
    'term',
    () => {
      this.SUBRULE(this.andTerm);
      this.MANY(() => {
        this.CONSUME(Or);
        this.SUBRULE2(this.andTerm);
      });
    },
    disableResyncOptions,
  );

  public andTerm = this.RULE(
    'andTerm',
    () => {
      this.SUBRULE(this.notTerm);
      this.MANY(() => {
        this.CONSUME(And);
        this.SUBRULE2(this.notTerm);
      });
    },
    disableResyncOptions,
  );

  public notTerm = this.RULE(
    'notTerm',
    () => {
      this.OPTION(() => {
        this.CONSUME(Not);
      });
      this.SUBRULE(this.clause);
    },
    disableResyncOptions,
  );

  public clause = this.RULE(
    'clause',
    () => {
      this.OR([
        {
          ALT: () => {
            this.SUBRULE(this.isZeroClause);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.boolFun);
          },
        },
        {
          ALT: () => {
            this.CONSUME(LeftParen);
            this.SUBRULE(this.term);
            this.CONSUME(RightParen);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public isZeroClause = this.RULE(
    'isZeroClause',
    () => {
      this.CONSUME(IsZero);
      this.CONSUME(LeftParen);
      this.SUBRULE(this.integer);
      this.CONSUME(RightParen);
    },
    disableResyncOptions,
  );

  public boolFun = this.RULE(
    'boolFun',
    () => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(FrontIsClear);
          },
        },
        {
          ALT: () => {
            this.CONSUME(FrontIsBlocked);
          },
        },
        {
          ALT: () => {
            this.CONSUME(LeftIsClear);
          },
        },
        {
          ALT: () => {
            this.CONSUME(LeftIsBlocked);
          },
        },
        {
          ALT: () => {
            this.CONSUME(RightIsClear);
          },
        },
        {
          ALT: () => {
            this.CONSUME(RightIsBlocked);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NextToABeeper);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NotNextToABeeper);
          },
        },
        {
          ALT: () => {
            this.CONSUME(AnyBeepersInBeeperBag);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NoBeepersInBeeperBag);
          },
        },
        {
          ALT: () => {
            this.CONSUME(FacingNorth);
          },
        },
        {
          ALT: () => {
            this.CONSUME(FacingSouth);
          },
        },
        {
          ALT: () => {
            this.CONSUME(FacingEast);
          },
        },
        {
          ALT: () => {
            this.CONSUME(FacingWest);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NotFacingNorth);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NotFacingSouth);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NotFacingEast);
          },
        },
        {
          ALT: () => {
            this.CONSUME(NotFacingWest);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public integer = this.RULE(
    'integer',
    () => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Identifier);
          },
        },
        {
          ALT: () => {
            this.CONSUME(IntegerLiteral);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.succPred);
            this.CONSUME(LeftParen);
            this.SUBRULE(this.integer);
            this.CONSUME(RightParen);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  public succPred = this.RULE(
    'succPred',
    () => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME(Succ);
          },
        },
        {
          ALT: () => {
            this.CONSUME(Pred);
          },
        },
      ]);
    },
    disableResyncOptions,
  );

  canTokenTypeBeInsertedInRecovery(tokType: chevrotain.TokenType): boolean {
    return tokType == Semicolon;
  }

  getTokenToInsert(tokType: chevrotain.TokenType): chevrotain.IToken {
    // The only difference between the default `getTokenToInsert` and this
    // version is that this sets the image to ';'.
    const tokToInsert = chevrotain.createTokenInstance(
      tokType,
      ';',
      NaN,
      NaN,
      NaN,
      NaN,
      NaN,
      NaN,
    );
    tokToInsert.isInsertedInRecovery = true;
    return tokToInsert;
  }
}

const parserInstance = new Parser();
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructor();
const BaseCstVisitorWithDefaults = parserInstance.getBaseCstVisitorConstructorWithDefaults();

class CompileVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  program(ctx: any): Program {
    const defList: FunctionDef[] = (ctx.defOrProto || []).map(
      (defOrProto: any): FunctionDef => this.visit(defOrProto),
    );
    const programDef = this.visit(ctx.programDef).concat([
      ['LINE', ctx.EndProgram[0].endLine - 1],
      ['HALT'],
    ]);
    return link(defList, programDef, /*requireDeclaration=*/ true);
  }

  programDef(ctx: any): Program {
    const statements: Program = [];
    for (const statement of ctx.statement || []) {
      statements.splice(statements.length, 0, ...this.visit(statement));
    }
    return statements;
  }

  block(ctx: any): Program {
    const statements: Program = [];
    for (const statement of ctx.statement || []) {
      statements.splice(statements.length, 0, ...this.visit(statement));
    }
    return statements;
  }

  defOrProto(ctx: any): FunctionDef {
    if (ctx.def) {
      return this.visit(ctx.def);
    } else if (ctx.proto) {
      return this.visit(ctx.proto);
    }
    throw new Error('Unknown defOrProto type: ' + Object.keys(ctx));
  }

  proto(ctx: any): FunctionDef {
    return {
      name: ctx.Identifier[0].image.toLowerCase(),
      body: null,
      numParams: (ctx.defParam ? ctx.defParam.length : 0) + 1,
      line: ctx.Identifier[0].startLine,
    };
  }

  def(ctx: any): FunctionDef {
    const defParam = this.visit(ctx.defParam);
    const result = this.visit(ctx.statement).concat([['RET']]);
    let numParams = 1;
    if (defParam) {
      numParams = 2;
      let currentLine: number = 1;
      for (const opcode of result) {
        if (opcode[0] == 'LINE') {
          currentLine = (<LineOpcode>opcode)[1];
        } else if (opcode[0] == 'PARAM') {
          const paramOpcode = <ParamOpcode>opcode;
          if (paramOpcode[1] != defParam) {
            throw new ParseError('undefined variable: ' + defParam, [
              {
                message: 'undefined-variable',
                location: {
                  text: defParam,
                  line: currentLine,
                },
              },
            ]);
          }
          paramOpcode[1] = 0;
        }
      }
    }
    return {
      name: ctx.Identifier[0].image.toLowerCase(),
      body: (<Program>[['LINE', ctx.Identifier[0].startLine - 1]]).concat(
        result,
      ),
      numParams: numParams,
      line: ctx.Identifier[0].startLine,
    };
  }

  defParam(ctx: any): string | null {
    if (ctx.Identifier) {
      return ctx.Identifier[0].image.toLowerCase();
    }
    return null;
  }

  singleStatement(ctx: any): Program {
    if (ctx.statementFun) {
      return this.visit(ctx.statementFun);
    } else if (ctx.call) {
      return this.visit(ctx.call);
    } else if (ctx.cond) {
      return this.visit(ctx.cond);
    } else if (ctx.loop) {
      return this.visit(ctx.loop);
    } else if (ctx.repeat) {
      return this.visit(ctx.repeat);
    } else if (ctx.block) {
      return this.visit(ctx.block);
    }
    throw new Error('Unknown single statement type: ' + Object.keys(ctx));
  }

  statement(ctx: any): Program {
    if (!ctx.singleStatement) {
      return [];
    }
    return this.visit(ctx.singleStatement);
  }

  statementFun(ctx: any): Program {
    if (ctx.Forward) {
      return [
        ['LINE', ctx.Forward[0].startLine - 1],
        ['WORLDWALLS'],
        ['ORIENTATION'],
        ['MASK'],
        ['AND'],
        ['NOT'],
        ['EZ', 'WALL'],
        ['FORWARD'],
      ];
    } else if (ctx.TurnLeft) {
      return [['LINE', ctx.TurnLeft[0].startLine - 1], ['LEFT']];
    } else if (ctx.PickBeeper) {
      return [
        ['LINE', ctx.PickBeeper[0].startLine - 1],
        ['WORLDBUZZERS'],
        ['EZ', 'WORLDUNDERFLOW'],
        ['PICKBUZZER'],
      ];
    } else if (ctx.PutBeeper) {
      return [
        ['LINE', ctx.PutBeeper[0].startLine - 1],
        ['BAGBUZZERS'],
        ['EZ', 'BAGUNDERFLOW'],
        ['LEAVEBUZZER'],
      ];
    } else if (ctx.TurnOff) {
      return [['LINE', ctx.TurnOff[0].startLine - 1], ['HALT']];
    } else if (ctx.Return) {
      return [['LINE', ctx.Return[0].startLine - 1], ['RET']];
    }
    throw new Error('Unknown statement function type: ' + Object.keys(ctx));
  }

  call(ctx: any): Program {
    const result = <Program>[['LINE', ctx.Identifier[0].startLine - 1]];
    if (ctx.integer) {
      return result.concat(this.visit(ctx.integer), [
        ['CALL', ctx.Identifier[0].image.toLowerCase(), 2],
        ['LINE', ctx.Identifier[0].startLine - 1],
      ]);
    }
    return result.concat([
      ['LOAD', 0],
      ['CALL', ctx.Identifier[0].image.toLowerCase(), 1],
      ['LINE', ctx.Identifier[0].startLine - 1],
    ]);
  }

  cond(ctx: any): Program {
    const term = this.visit(ctx.term);
    const statement = this.visit(ctx.singleStatement[0]);
    if (ctx.singleStatement.length == 2) {
      const elseStatement = this.visit(ctx.singleStatement[1]);
      return (<Program>[['LINE', ctx.If[0].startLine - 1]]).concat(
        term,
        [['JZ', 1 + statement.length]],
        statement,
        [['JMP', elseStatement.length]],
        elseStatement,
      );
    }
    return (<Program>[['LINE', ctx.If[0].startLine - 1]]).concat(
      term,
      [['JZ', statement.length]],
      statement,
    );
  }

  loop(ctx: any): Program {
    const term = this.visit(ctx.term);
    const statement = this.visit(ctx.singleStatement);
    return (<Program>[['LINE', ctx.While[0].startLine - 1]]).concat(
      term,
      [['JZ', 1 + statement.length]],
      statement,
      [['JMP', -1 - (term.length + statement.length + 1)]],
    );
  }

  repeat(ctx: any): Program {
    const integer = this.visit(ctx.integer);
    const statement = this.visit(ctx.singleStatement);
    return (<Program>[['LINE', ctx.Repeat[0].startLine - 1]]).concat(
      integer,
      [['DUP'], ['LOAD', 0], ['EQ'], ['NOT'], ['JZ', statement.length + 2]],
      statement,
      [['DEC'], ['JMP', -1 - (statement.length + 6)], ['POP']],
    );
  }

  term(ctx: any): Program {
    const result = this.visit(ctx.andTerm[0]);
    for (let i = 1; i < ctx.andTerm.length; i++) {
      result.splice(result.length, 0, ...this.visit(ctx.andTerm[i]), ['OR']);
    }
    return result;
  }

  andTerm(ctx: any): Program {
    const result = this.visit(ctx.notTerm[0]);
    for (let i = 1; i < ctx.notTerm.length; i++) {
      result.splice(result.length, 0, ...this.visit(ctx.notTerm[i]), ['AND']);
    }
    return result;
  }

  notTerm(ctx: any): Program {
    const result = this.visit(ctx.clause);
    if (ctx.Not) {
      return result.concat([['NOT']]);
    }
    return result;
  }

  clause(ctx: any): Program {
    if (ctx.isZeroClause) {
      return this.visit(ctx.isZeroClause);
    } else if (ctx.boolFun) {
      return this.visit(ctx.boolFun);
    } else if (ctx.term) {
      return this.visit(ctx.term);
    }
    throw new Error('Unknown clause type: ' + Object.keys(ctx));
  }

  isZeroClause(ctx: any): Program {
    return this.visit(ctx.integer).concat([['NOT']]);
  }

  boolFun(ctx: any): Program {
    if (ctx.FrontIsClear) {
      return [['WORLDWALLS'], ['ORIENTATION'], ['MASK'], ['AND'], ['NOT']];
    } else if (ctx.FrontIsBlocked) {
      return [['WORLDWALLS'], ['ORIENTATION'], ['MASK'], ['AND']];
    } else if (ctx.LeftIsClear) {
      return [
        ['WORLDWALLS'],
        ['ORIENTATION'],
        ['ROTL'],
        ['MASK'],
        ['AND'],
        ['NOT'],
      ];
    } else if (ctx.LeftIsBlocked) {
      return [['WORLDWALLS'], ['ORIENTATION'], ['ROTL'], ['MASK'], ['AND']];
    } else if (ctx.RightIsClear) {
      return [
        ['WORLDWALLS'],
        ['ORIENTATION'],
        ['ROTR'],
        ['MASK'],
        ['AND'],
        ['NOT'],
      ];
    } else if (ctx.RightIsBlocked) {
      return [['WORLDWALLS'], ['ORIENTATION'], ['ROTR'], ['MASK'], ['AND']];
    } else if (ctx.NextToABeeper) {
      return [['WORLDBUZZERS'], ['LOAD', 0], ['EQ'], ['NOT']];
    } else if (ctx.NotNextToABeeper) {
      return [['WORLDBUZZERS'], ['NOT']];
    } else if (ctx.AnyBeepersInBeeperBag) {
      return [['BAGBUZZERS'], ['LOAD', 0], ['EQ'], ['NOT']];
    } else if (ctx.NoBeepersInBeeperBag) {
      return [['BAGBUZZERS'], ['NOT']];
    } else if (ctx.FacingWest) {
      return [['ORIENTATION'], ['LOAD', 0], ['EQ']];
    } else if (ctx.FacingNorth) {
      return [['ORIENTATION'], ['LOAD', 1], ['EQ']];
    } else if (ctx.FacingEast) {
      return [['ORIENTATION'], ['LOAD', 2], ['EQ']];
    } else if (ctx.FacingSouth) {
      return [['ORIENTATION'], ['LOAD', 3], ['EQ']];
    } else if (ctx.NotFacingWest) {
      return [['ORIENTATION'], ['LOAD', 0], ['EQ'], ['NOT']];
    } else if (ctx.NotFacingNorth) {
      return [['ORIENTATION'], ['LOAD', 1], ['EQ'], ['NOT']];
    } else if (ctx.NotFacingEast) {
      return [['ORIENTATION'], ['LOAD', 2], ['EQ'], ['NOT']];
    } else if (ctx.NotFacingSouth) {
      return [['ORIENTATION'], ['LOAD', 3], ['EQ'], ['NOT']];
    }
    throw new Error('Unknown boolean function: ' + Object.keys(ctx));
  }

  integer(ctx: any): Program {
    if (ctx.Identifier) {
      return [['PARAM', ctx.Identifier[0].image.toLowerCase()]];
    } else if (ctx.IntegerLiteral) {
      return [['LOAD', parseInt(ctx.IntegerLiteral[0].image)]];
    } else if (ctx.succPred) {
      return this.visit(ctx.integer).concat(this.visit(ctx.succPred));
    }
    throw new Error('Unknown integer: ' + Object.keys(ctx));
  }

  succPred(ctx: any): Program {
    if (ctx.Succ) {
      return [['INC']];
    } else if (ctx.Pred) {
      return [['DEC']];
    }
    throw new Error('Unknown succ()/pred(): ' + Object.keys(ctx));
  }
}

const compileVisitorInstance = new CompileVisitor();

class SemicolonFixerVisitor extends BaseCstVisitorWithDefaults {
  constructor() {
    super();
    this.validateVisitor();
  }

  statement(ctx: any): void {
    if (!ctx.singleStatement) return;
    this.visit(ctx.singleStatement);
    if (!ctx.Semicolon[0].isInsertedInRecovery) {
      return;
    }
    // Fix the position of the synthesized semicolon. That way the
    // comment-insertion algorithm won't try to append it to the right of
    // it always because of the way the binary search works.
    let node = ctx.singleStatement[0];
    while (node.children) {
      node = Object.values(node.children);
      while (Array.isArray(node)) {
        node = node[node.length - 1];
      }
    }
    ctx.Semicolon[0].startOffset = ctx.Semicolon[0].endOffset =
      node.endOffset + 1;
  }
}

const semicolonFixerVisitorInstance = new SemicolonFixerVisitor();

/**
 * A [Concrete Syntax
 * Tree](https://en.wikipedia.org/wiki/Concrete_Syntax_Tree),
 * with a separate array of comments, which can be useful for auto-formatters.
 */
export type Cst = chevrotain.CstNode & {
  comments: chevrotain.IToken[];
};

/**
 * Parses Karel source code and returns the resulting Cst.
 *
 * @param source The source of the program to be compiled.
 */
export function parse(source: string, filename?: string): Cst {
  try {
    const lexingResult = lexerInstance.tokenize(source);
    if (lexingResult.errors.length > 0) {
      throw new ParseError(
        'lexing errors detected',
        lexingResult.errors.map((lexError) => ({
          message: 'lexing-error',
          location: {
            text: source.substr(lexError.offset, lexError.length),
            line: lexError.line,
            column: lexError.column,
          },
        })),
      );
    }

    parserInstance.input = lexingResult.tokens;
    const cst: chevrotain.CstNode & {
      comments?: chevrotain.IToken[];
    } = parserInstance.program();
    // Ignore inserted semicolons at the end of blocks. Those are totally fine.
    // But do that only if the CST was actually able to be generated.
    const errors = cst
      ? parserInstance.errors.filter((error) => {
          if (
            error.token.tokenType != End &&
            error.token.tokenType != EndExecution
          ) {
            // The only inserted semicolons that are acceptable are the ones that
            // occur just before the end of a block / execution block.
            return true;
          }
          if (error.message.substring(0, 1) !== '{') {
            // The only errors that can be filtered out are the ones that are
            // already in JSON.
            return true;
          }
          const diagnostic: Diagnostic = JSON.parse(error.message);
          return (
            diagnostic.message != 'mismatched-token' ||
            diagnostic?.location?.expected?.length !== 1 ||
            diagnostic?.location?.expected?.[0] !== ';'
          );
        })
      : parserInstance.errors;
    if (errors.length != parserInstance.errors.length) {
      semicolonFixerVisitorInstance.visit(cst);
    }
    if (errors.length > 0) {
      throw new ParseError(
        'parse errors detected',
        errors.map(
          (parseError): Diagnostic => {
            if (parseError.message.substring(0, 1) === '{') {
              // These errors are emitted by the `errorMessageProvider`. They are
              // JSON-encoded Diagnostic messages already!
              return JSON.parse(parseError.message);
            }
            // We tried to return a prettier version of the error, but failed.
            return {
              message: 'parse-error',
              location: {
                text: parseError.token.image,
                line: parseError.token.startLine,
                column: parseError.token.startColumn,
              },
            };
          },
        ),
      );
    }

    cst.comments = lexingResult.groups.comments;
    return <Cst>cst;
  } catch (e) {
    // Try to format the error message nicely before returning it to the user.
    // This is useful for prettier, since the catching-and-rethrowing process
    // loses the diagnostics information.
    if (e.format) {
      e.format(source, filename);
    }
    throw e;
  }
}

/**
 * Compiles Karel source code and returns the resulting Karel program, which is
 * a list of opcodes.
 *
 * @param source The source of the program to be compiled.
 */
export function compile(source: string, filename?: string): Program {
  return compileVisitorInstance.visit(parse(source, filename));
}
