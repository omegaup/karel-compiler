import 'mocha';

import { expect } from 'chai';

import { ParseError } from '../src/errors';
import { compile, parse } from '../src/pascal';

describe('Karel Pascal', function () {
  describe('parse()', function () {
    it('should skip unknown tokens', function () {
      const result = parse(
        '\niniciar-programa: inicia-ejecución: termina-ejecución finalizar-programa',
      );
      expect(result).to.not.be.null;
      expect(result.comments).to.be.empty;
    });

    describe('should detect parse errors', function () {
      it('with one alternative', function () {
        try {
          parse('\niniciar-programa foo termina-ejecución finalizar-programa');
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'mismatched-token',
              location: {
                text: 'foo',
                line: 2,
                column: 18,
                expected: ['inicia-ejecución'],
              },
            },
          ]);
        }
      });

      it('with multiple alternatives', function () {
        try {
          parse(
            '\niniciar-programa inicia-ejecución si 5 entonces ; termina-ejecución finalizar-programa',
          );
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'mismatched-token',
              location: {
                text: '5',
                line: 2,
                column: 38,
                expected: [
                  'si-es-cero',
                  'frente-libre',
                  'frente-bloqueado',
                  'izquierda-libre',
                  'izquierda-bloqueada',
                  'derecha-libre',
                  'derecha-bloqueada',
                  'junto-a-zumbador',
                  'no-junto-a-zumbador',
                  'algún-zumbador-en-la-mochila',
                  'ningún-zumbador-en-la-mochila',
                  'orientado-al-norte',
                  'orientado-al-sur',
                  'orientado-al-este',
                  'orientado-al-oeste',
                  'no-orientado-al-norte',
                  'no-orientado-al-sur',
                  'no-orientado-al-este',
                  'no-orientado-al-oeste',
                  '(',
                ],
              },
            },
          ]);
        }
      });

      it('with trailing tokens', function () {
        try {
          parse(
            '\niniciar-programa inicia-ejecución termina-ejecución finalizar-programa foo',
          );
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'expected-eof',
              location: {
                text: 'foo',
                line: 2,
                column: 72,
                expected: [],
              },
            },
          ]);
        }
      });
    });

    it('should parse the most basic program', function () {
      const result = parse(
        'iniciar-programa inicia-ejecución termina-ejecución finalizar-programa',
      );
      expect(result).to.not.be.null;
      expect(result.comments).to.be.empty;
    });

    describe('should handle comments', function () {
      it('trailing, inline', function () {
        const result = parse(
          '\niniciar-programa inicia-ejecución termina-ejecución finalizar-programa { foo }',
        );
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '{ foo }',
        ]);
        expect(
          result.comments.map((comment) => comment.startLine),
        ).to.deep.equal([2]);
      });

      it('trailing, block', function () {
        const result = parse(
          '\niniciar-programa inicia-ejecución termina-ejecución finalizar-programa (* foo *)',
        );
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '(* foo *)',
        ]);
        expect(
          result.comments.map((comment) => comment.startLine),
        ).to.deep.equal([2]);
      });

      it('embedded, block', function () {
        const result = parse(
          '\niniciar-programa inicia-ejecución (* foo *) termina-ejecución finalizar-programa',
        );
        expect(result).to.not.be.null;
        expect(result.comments.map((comment) => comment.image)).to.deep.equal([
          '(* foo *)',
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
            iniciar-programa
              define-nueva-instrucción foo como inicio fin;
              define-nueva-instrucción foo como inicio fin;
              inicia-ejecución
              termina-ejecución
            finalizar-programa
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

      it('prototype redefinition', function () {
        try {
          compile(`
            iniciar-programa
              define-prototipo-instrucción foo;
              define-prototipo-instrucción foo;
              inicia-ejecución
              termina-ejecución
            finalizar-programa
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'prototype-redefinition',
              location: {
                text: 'foo',
                line: 4,
              },
            },
          ]);
        }
      });

      it('prototype parameter mismatch - more', function () {
        try {
          compile(`
            iniciar-programa
              define-prototipo-instrucción foo;
              define-nueva-instrucción foo(n) como inicio fin;
              inicia-ejecución
              termina-ejecución
            finalizar-programa
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'prototype-parameter-mismatch',
              location: {
                text: 'foo',
                line: 4,
              },
            },
          ]);
        }
      });

      it('prototype parameter mismatch - fewer', function () {
        try {
          compile(`
            iniciar-programa
              define-prototipo-instrucción foo(n);
              define-nueva-instrucción foo como inicio fin;
              inicia-ejecución
              termina-ejecución
            finalizar-programa
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'prototype-parameter-mismatch',
              location: {
                text: 'foo',
                line: 4,
              },
            },
          ]);
        }
      });

      it('undefined function - not yet declared', function () {
        try {
          compile(`
            iniciar-programa
              define-nueva-instrucción foo como inicio bar; fin;
              define-nueva-instrucción bar como inicio foo; fin;
              inicia-ejecución
                foo;
              termina-ejecución
            finalizar-programa
          `);
          expect.fail('Should have thrown an error');
        } catch (e) {
          expect(e.diagnostics).to.deep.equal([
            {
              message: 'undefined-function',
              location: {
                text: 'bar',
                line: 3,
              },
            },
          ]);
        }
      });

      it('undefined function', function () {
        try {
          compile(`
            iniciar-programa
              inicia-ejecución
                foo;
              termina-ejecución
            finalizar-programa
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
            iniciar-programa
              define-nueva-instrucción foo como inicio fin;
              inicia-ejecución
                foo(5);
              termina-ejecución
            finalizar-programa
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
            iniciar-programa
              define-nueva-instrucción foo(n) como inicio fin;
              inicia-ejecución
                foo;
              termina-ejecución
            finalizar-programa
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
            iniciar-programa
              define-nueva-instrucción foo como si si-es-cero(n) entonces inicio fin;
              inicia-ejecución
                foo;
              termina-ejecución
            finalizar-programa
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
            iniciar-programa
              inicia-ejecución
                si si-es-cero(n) entonces inicio fin;
              termina-ejecución
            finalizar-programa
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
            iniciar-programa
              define-nueva-instrucción foo como si si-es-cero(n) entonces inicio fin;
              define-nueva-instrucción foo(n) como inicio fin;
              inicia-ejecución
                bar;
                foo(n);
              termina-ejecución
            finalizar-programa
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
      const result = compile(
        'iniciar-programa inicia-ejecución termina-ejecución finalizar-programa',
      );
      expect(result).to.deep.equal([['LINE', 0], ['HALT']]);
    });

    it('can call functions that have not been declared yet', function () {
      const result = compile(`
        iniciar-programa
          define-prototipo-instrucción bar;
          define-nueva-instrucción foo como inicio bar; fin;
          define-nueva-instrucción bar como inicio foo; fin;
          inicia-ejecución
            foo;
          termina-ejecución
        finalizar-programa
      `);
      expect(result).to.not.be.empty;
    });
  });
});
