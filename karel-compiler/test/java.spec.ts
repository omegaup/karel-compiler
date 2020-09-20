import 'mocha';

import { expect } from 'chai';

import { ParseError } from '../src/errors';
import { compile, parse } from '../src/java';

describe('Karel Java', function () {
  describe('parse()', function () {
    it('should detect unknown tokens', function () {
      try {
        parse('\nclass ~program { program() {} }');
        expect.fail('Should have thrown an error');
      } catch (e) {
        expect(e.diagnostics).to.deep.equal([
          {
            message: 'lexing-error',
            location: {
              text: '~',
              line: 2,
              column: 7,
            },
          },
        ]);
      }
    });

    describe('should detect parse errors', function () {
      it('with one alternative', function () {
        try {
          parse('\nclass program { foo() {} }');
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'mismatched-token',
              location: {
                text: 'foo',
                line: 2,
                column: 17,
                expected: ['program'],
              },
            },
          ]);
        }
      });

      it('with multiple alternatives', function () {
        try {
          parse('\nclass program { program() { if (5); } }');
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'mismatched-token',
              location: {
                text: '5',
                line: 2,
                column: 33,
                expected: [
                  'iszero',
                  'frontIsClear',
                  'frontIsBlocked',
                  'leftIsClear',
                  'leftIsBlocked',
                  'rightIsClear',
                  'rightIsBlocked',
                  'nextToABeeper',
                  'notNextToABeeper',
                  'anyBeepersInBeeperBag',
                  'noBeepersInBeeperBag',
                  'facingNorth',
                  'facingSouth',
                  'facingEast',
                  'facingWest',
                  'notFacingNorth',
                  'notFacingSouth',
                  'notFacingEast',
                  'notFacingWest',
                  '(',
                ],
              },
            },
          ]);
        }
      });

      it('with trailing tokens', function () {
        try {
          parse('\nclass program { program() {} } foo');
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'expected-eof',
              location: {
                text: 'foo',
                line: 2,
                column: 32,
                expected: [],
              },
            },
          ]);
        }
      });
    });

    it('should parse the most basic program', function () {
      const result = parse('class program { program() {} }');
      expect(result).to.not.be.null;
      expect(result.comments).to.be.empty;
    });

    describe('should handle comments', function () {
      it('trailing, inline', function () {
        const result = parse('\nclass program { program() {} } // foo');
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '// foo',
        ]);
        expect(
          result.comments.map((comment) => comment.startLine),
        ).to.deep.equal([2]);
      });

      it('trailing, block', function () {
        const result = parse('\nclass program { program() {} } /* foo */');
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '/* foo */',
        ]);
        expect(
          result.comments.map((comment) => comment.startLine),
        ).to.deep.equal([2]);
      });

      it('embedded, block', function () {
        const result = parse('\nclass program { program() { /* foo */ } }');
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '/* foo */',
        ]);
        expect(
          result.comments.map((comment) => comment.startLine),
        ).to.deep.equal([2]);
      });
    });
  });

  describe('compile()', function () {
    describe('should detect semantic errors', function () {
      it('function redefinition', function () {
        try {
          compile(`
            class program {
              void foo() {}  // This one is fine.
              void foo() {}  // This one is the one that throws.
              program() {}
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'function-redefinition',
              location: {
                text: 'foo',
                line: 4,
              },
            },
          ]);
        }
      });

      it('undefined function', function () {
        try {
          compile(`
            class program {
              program() {
                foo();
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'undefined-function',
              location: {
                text: 'foo',
                line: 4,
              },
            },
          ]);
        }
      });

      it('function parameter mismatch - more', function () {
        try {
          compile(`
            class program {
              void foo() {}
              program() {
                foo(1);
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'function-parameter-mismatch',
              location: {
                text: 'foo',
                line: 5,
              },
            },
          ]);
        }
      });

      it('function parameter mismatch - fewer', function () {
        try {
          compile(`
            class program {
              void foo(n) {}
              program() {
                foo();
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'function-parameter-mismatch',
              location: {
                text: 'foo',
                line: 5,
              },
            },
          ]);
        }
      });

      it('undefined variable in function', function () {
        try {
          compile(`
            class program {
              void foo() { if (iszero(n)) {} }
              program() {
                foo();
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'undefined-variable',
              location: {
                text: 'n',
                line: 3,
              },
            },
          ]);
        }
      });

      it('undefined variable in program', function () {
        try {
          compile(`
            class program {
              program() {
                if (iszero(n)) {}
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'undefined-variable',
              location: {
                text: 'n',
                line: 4,
              },
            },
          ]);
        }
      });

      it('multiple errors', function () {
        try {
          compile(`
            class program {
              void foo() { if (iszero(n)) {} }
              void foo(n) {}
              program() {
                bar();
                foo(n);
              }
            }
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'function-redefinition',
              location: {
                text: 'foo',
                line: 4,
              },
            },
            {
              message: 'undefined-function',
              location: {
                text: 'bar',
                line: 6,
              },
            },
            {
              message: 'undefined-variable',
              location: {
                text: 'n',
                line: 7,
              },
            },
            {
              message: 'function-parameter-mismatch',
              location: {
                text: 'foo',
                line: 7,
              },
            },
            {
              message: 'undefined-variable',
              location: {
                text: 'n',
                line: 3,
              },
            },
          ]);
        }
      });
    });

    it('should compile the most basic program', function () {
      const result = compile('class program { program() {} }');
      expect(result).to.deep.equal([['LINE', 0], ['HALT']]);
    });

    it('can call functions that have not been declared yet', function () {
      const result = compile(`
          class program {
            void foo() { bar(); }
            void bar() { foo(); }
            program() {
              foo();
            }
          }
      `);
      expect(result).to.not.be.empty;
    });
  });
});
