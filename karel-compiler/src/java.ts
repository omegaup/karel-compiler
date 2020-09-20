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
  pattern: /[a-zA-Z][a-zA-Z0-9_]*/,
  label: '<var>',
});

const Whitespace = chevrotain.createToken({
  name: 'Whitespace',
  pattern: /\s+/,
  group: chevrotain.Lexer.SKIPPED,
});
const LineComment = chevrotain.createToken({
  name: 'LineComment',
  pattern: /\/\/[^\n]*/,
  group: 'comments',
});
const BlockComment = chevrotain.createToken({
  name: 'BlockComment',
  pattern: /\/\*(?:[^*]|\*(?!\/))*\*\//,
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

const Class = keyword('Class', /class/, 'class');
const Program = keyword('Program', /program/, 'program');
const Define = keyword('Define', /define|void/, 'void');
const Return = keyword('Return', /return/, 'return');
const TurnOff = keyword('TurnOff', /turnoff/, 'turnoff');
const TurnLeft = keyword('TurnLeft', /turnleft/, 'turnleft');
const Move = keyword('Move', /move/, 'move');
const PickBeeper = keyword('PickBeeper', /pickbeeper/, 'pickbeeper');
const PutBeeper = keyword('PutBeeper', /putbeeper/, 'putbeeper');
const While = keyword('While', /while/, 'while');
const Iterate = keyword('Iterate', /iterate/, 'iterate');
const Pred = keyword('Pred', /pred/, 'pred');
const Succ = keyword('Succ', /succ/, 'succ');
const IsZero = keyword('IsZero', /iszero/, 'iszero');
const FrontIsClear = keyword('FrontIsClear', /frontIsClear/, 'frontIsClear');
const FrontIsBlocked = keyword(
  'FrontIsBlocked',
  /frontIsBlocked/,
  'frontIsBlocked',
);
const LeftIsClear = keyword('LeftIsClear', /leftIsClear/, 'leftIsClear');
const LeftIsBlocked = keyword(
  'LeftIsBlocked',
  /leftIsBlocked/,
  'leftIsBlocked',
);
const RightIsClear = keyword('RightIsClear', /rightIsClear/, 'rightIsClear');
const RightIsBlocked = keyword(
  'RightIsBlocked',
  /rightIsBlocked/,
  'rightIsBlocked',
);
const NextToABeeper = keyword(
  'NextToABeeper',
  /nextToABeeper/,
  'nextToABeeper',
);
const NotNextToABeeper = keyword(
  'NotNextToABeeper',
  /notNextToABeeper/,
  'notNextToABeeper',
);
const AnyBeepersInBeeperBag = keyword(
  'AnyBeepersInBeeperBag',
  /anyBeepersInBeeperBag/,
  'anyBeepersInBeeperBag',
);
const NoBeepersInBeeperBag = keyword(
  'NoBeepersInBeeperBag',
  /noBeepersInBeeperBag/,
  'noBeepersInBeeperBag',
);
const FacingNorth = keyword('FacingNorth', /facingNorth/, 'facingNorth');
const FacingSouth = keyword('FacingSouth', /facingSouth/, 'facingSouth');
const FacingEast = keyword('FacingEast', /facingEast/, 'facingEast');
const FacingWest = keyword('FacingWest', /facingWest/, 'facingWest');
const NotFacingNorth = keyword(
  'NotFacingNorth',
  /notFacingNorth/,
  'notFacingNorth',
);
const NotFacingSouth = keyword(
  'NotFacingSouth',
  /notFacingSouth/,
  'notFacingSouth',
);
const NotFacingEast = keyword(
  'NotFacingEast',
  /notFacingEast/,
  'notFacingEast',
);
const NotFacingWest = keyword(
  'NotFacingWest',
  /notFacingWest/,
  'notFacingWest',
);
const Else = keyword('Else', /else/, 'else');
const If = keyword('If', /if/, 'if');

const Not = chevrotain.createToken({ name: 'Not', pattern: /!/, label: '!' });
const Or = chevrotain.createToken({ name: 'Or', pattern: /\|\|/, label: '||' });
const And = chevrotain.createToken({
  name: 'And',
  pattern: /&&?/,
  label: '&&',
});
const LeftParen = chevrotain.createToken({
  name: 'LeftParen',
  pattern: /\(/,
  label: '(',
});
const RightParen = chevrotain.createToken({
  name: 'RightParen',
  pattern: /\)/,
  label: ')',
});
const LeftBrace = chevrotain.createToken({
  name: 'LeftBrace',
  pattern: /\{/,
  label: '}',
});
const RightBrace = chevrotain.createToken({
  name: 'RightBrace',
  pattern: /\}/,
  label: '}',
});
const Semicolon = chevrotain.createToken({
  name: 'Semicolon',
  pattern: /;/,
  label: ';',
});
const IntegerLiteral = chevrotain.createToken({
  name: 'IntegerLiteral',
  pattern: /\d+/,
  label: '<int>',
});

const allTokens = [
  Whitespace,

  // Keywords.
  Class,
  Program,
  Define,
  Return,
  TurnOff,
  TurnLeft,
  Move,
  PickBeeper,
  PutBeeper,
  While,
  Iterate,
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

  IntegerLiteral,
  Identifier,

  Not,
  Or,
  And,
  LeftParen,
  RightParen,
  LeftBrace,
  RightBrace,
  Semicolon,

  LineComment,
  BlockComment,
];

const lexerInstance = new chevrotain.Lexer(allTokens);

const tokenVocabulary: { [key: string]: chevrotain.TokenType } = {};
allTokens.forEach((tokenType) => {
  tokenVocabulary[tokenType.name] = tokenType;
});

class Parser extends chevrotain.CstParser {
  constructor() {
    super(tokenVocabulary, {
      errorMessageProvider: errorMessageProvider,
    });

    this.performSelfAnalysis();
  }

  public programClass = this.RULE('programClass', () => {
    this.CONSUME(Class);
    this.CONSUME(Program);
    this.CONSUME(LeftBrace);
    this.MANY(() => {
      this.SUBRULE(this.def);
    });
    this.SUBRULE(this.programDef);
    this.CONSUME(RightBrace);
  });

  public programDef = this.RULE('programDef', () => {
    this.CONSUME(Program);
    this.CONSUME(LeftParen);
    this.CONSUME(RightParen);
    this.SUBRULE(this.block);
  });

  public block = this.RULE('block', () => {
    this.CONSUME(LeftBrace);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RightBrace);
  });

  public def = this.RULE('def', () => {
    this.CONSUME(Define);
    this.CONSUME(Identifier);
    this.SUBRULE(this.defParam);
    this.SUBRULE(this.block);
  });

  public defParam = this.RULE('defParam', () => {
    this.CONSUME(LeftParen);
    this.OPTION(() => {
      this.CONSUME(Identifier);
    });
    this.CONSUME(RightParen);
  });

  public statement = this.RULE('statement', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.singleStatement);
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
  });

  public singleStatement = this.RULE('singleStatement', () => {
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            this.SUBRULE(this.statementFun);
            this.CONSUME(LeftParen);
            this.CONSUME(RightParen);
          },
        },
        {
          ALT: () => {
            this.SUBRULE(this.call);
          },
        },
      ]);
    });
    this.CONSUME(Semicolon);
  });

  public statementFun = this.RULE('statementFun', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Move);
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
  });

  public call = this.RULE('call', () => {
    this.CONSUME(Identifier);
    this.CONSUME(LeftParen);
    this.OPTION(() => {
      this.SUBRULE(this.integer);
    });
    this.CONSUME(RightParen);
  });

  public cond = this.RULE('cond', () => {
    this.CONSUME(If);
    this.CONSUME(LeftParen);
    this.SUBRULE(this.term);
    this.CONSUME(RightParen);
    this.SUBRULE(this.statement);
    this.OPTION(() => {
      this.CONSUME(Else);
      this.SUBRULE2(this.statement);
    });
  });

  public loop = this.RULE('loop', () => {
    this.CONSUME(While);
    this.CONSUME(LeftParen);
    this.SUBRULE(this.term);
    this.CONSUME(RightParen);
    this.SUBRULE(this.statement);
  });

  public repeat = this.RULE('repeat', () => {
    this.CONSUME(Iterate);
    this.CONSUME(LeftParen);
    this.SUBRULE(this.integer);
    this.CONSUME(RightParen);
    this.SUBRULE(this.statement);
  });

  public term = this.RULE('term', () => {
    this.SUBRULE(this.andTerm);
    this.MANY(() => {
      this.CONSUME(Or);
      this.SUBRULE2(this.andTerm);
    });
  });

  public andTerm = this.RULE('andTerm', () => {
    this.SUBRULE(this.notTerm);
    this.MANY(() => {
      this.CONSUME(And);
      this.SUBRULE2(this.notTerm);
    });
  });

  public notTerm = this.RULE('notTerm', () => {
    this.OPTION(() => {
      this.CONSUME(Not);
    });
    this.SUBRULE(this.clause);
  });

  public clause = this.RULE('clause', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.isZeroClause);
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.boolFunClause);
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
  });

  public isZeroClause = this.RULE('isZeroClause', () => {
    this.CONSUME(IsZero);
    this.CONSUME(LeftParen);
    this.SUBRULE(this.integer);
    this.CONSUME(RightParen);
  });

  public boolFunClause = this.RULE('boolFunClause', () => {
    this.SUBRULE(this.boolFun);
    this.OPTION(() => {
      this.CONSUME(LeftParen);
      this.CONSUME(RightParen);
    });
  });

  public boolFun = this.RULE('boolFun', () => {
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
  });

  public integer = this.RULE('integer', () => {
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
  });

  public succPred = this.RULE('succPred', () => {
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
  });
}

const parserInstance = new Parser();
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructor();

class CompileVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  programClass(ctx: any): Program {
    const defList = (ctx.def || []).map(
      (def: any): FunctionDef => this.visit(def),
    );
    const programDef = this.visit(ctx.programDef).concat([
      ['LINE', ctx.RightBrace[0].endLine - 1],
      ['HALT'],
    ]);
    return link(defList, programDef, /*requireDeclaration=*/ false);
  }

  programDef(ctx: any): Program {
    return this.visit(ctx.block);
  }

  block(ctx: any): Program {
    const statements: Program = [];
    for (const statement of ctx.statement || []) {
      statements.splice(statements.length, 0, ...this.visit(statement));
    }
    return statements;
  }

  def(ctx: any): FunctionDef {
    const defParam: string | null = this.visit(ctx.defParam);
    const result = this.visit(ctx.block).concat([['RET']]);
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
            throw new ParseError('Undefined variable: ' + defParam, [
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
      name: ctx.Identifier[0].image,
      body: <Program>[['LINE', ctx.Identifier[0].startLine - 1]].concat(result),
      numParams,
      line: ctx.Identifier[0].startLine,
    };
  }

  defParam(ctx: any): string | null {
    if (ctx.Identifier) {
      return ctx.Identifier[0].image;
    }
    return null;
  }

  statement(ctx: any): Program {
    if (ctx.singleStatement) {
      return this.visit(ctx.singleStatement);
    } else if (ctx.cond) {
      return this.visit(ctx.cond);
    } else if (ctx.loop) {
      return this.visit(ctx.loop);
    } else if (ctx.repeat) {
      return this.visit(ctx.repeat);
    } else if (ctx.block) {
      return this.visit(ctx.block);
    }
    throw new Error('Unknown statement type: ' + Object.keys(ctx));
  }

  singleStatement(ctx: any): Program {
    if (ctx.statementFun) {
      return this.visit(ctx.statementFun);
    } else if (ctx.call) {
      return this.visit(ctx.call);
    } else {
      return [];
    }
    throw new Error('Unknown single statement type: ' + Object.keys(ctx));
  }

  statementFun(ctx: any): Program {
    if (ctx.Move) {
      return [
        ['LINE', ctx.Move[0].startLine - 1],
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
    const result: Program = [['LINE', ctx.Identifier[0].startLine - 1]];
    if (ctx.integer) {
      return result.concat(this.visit(ctx.integer), [
        ['CALL', ctx.Identifier[0].image, 2],
        ['LINE', ctx.Identifier[0].startLine - 1],
      ]);
    }
    return result.concat([
      ['LOAD', 0],
      ['CALL', ctx.Identifier[0].image, 1],
      ['LINE', ctx.Identifier[0].startLine - 1],
    ]);
  }

  cond(ctx: any): Program {
    const term = this.visit(ctx.term);
    const statement = this.visit(ctx.statement[0]);
    if (ctx.statement.length == 2) {
      const elseStatement = this.visit(ctx.statement[1]);
      return <Program>(
        [['LINE', ctx.If[0].startLine - 1]].concat(
          term,
          [['JZ', 1 + statement.length]],
          statement,
          [['JMP', elseStatement.length]],
          elseStatement,
        )
      );
    }
    return <Program>(
      [['LINE', ctx.If[0].startLine - 1]].concat(
        term,
        [['JZ', statement.length]],
        statement,
      )
    );
  }

  loop(ctx: any): Program {
    const term: Program = this.visit(ctx.term);
    const statement: Program = this.visit(ctx.statement);
    return <Program>(
      [['LINE', ctx.While[0].startLine - 1]].concat(
        term,
        [['JZ', 1 + statement.length]],
        statement,
        [['JMP', -1 - (term.length + statement.length + 1)]],
      )
    );
  }

  repeat(ctx: any): Program {
    const integer: Program = this.visit(ctx.integer);
    const statement: Program = this.visit(ctx.statement);
    return <Program>(
      [['LINE', ctx.Iterate[0].startLine - 1]].concat(
        integer,
        [['DUP'], ['LOAD', 0], ['EQ'], ['NOT'], ['JZ', statement.length + 2]],
        statement,
        [['DEC'], ['JMP', -1 - (statement.length + 6)], ['POP']],
      )
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
    } else if (ctx.boolFunClause) {
      return this.visit(ctx.boolFunClause);
    } else if (ctx.term) {
      return this.visit(ctx.term);
    }
    throw new Error('Unknown clause type: ' + Object.keys(ctx));
  }

  isZeroClause(ctx: any): Program {
    return this.visit(ctx.integer).concat([['NOT']]);
  }

  boolFunClause(ctx: any): Program {
    return this.visit(ctx.boolFun);
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
      return [['PARAM', ctx.Identifier[0].image]];
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
    } = parserInstance.programClass();
    if (parserInstance.errors.length > 0) {
      throw new ParseError(
        'parse errors detected',
        parserInstance.errors.map(
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
