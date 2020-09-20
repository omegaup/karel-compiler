import {pascal, Token} from 'karel-compiler';
import * as prettier from 'prettier';

const {builders} = prettier.doc;

export const parser = {
  parse : function(
              text: string,
              parsers: object,
              options: any,
              ) : prettier.AST {
    const cst = pascal.parse(text, options.filepath);
    // Prettier expects the comment nodes to have the text in the `value`
    // property, not `image`.
    cst.comments = cst.comments.map(
        (
            comment: Token&{value?: string},
            ):
            Token&{value : string} => {
              comment.value = comment.image;
              return <Token&{value : string}>comment;
            },
    );
    return cst;
  },
  astFormat : 'karel-pascal-cst',
  locStart : function(node: any) : number {
    while (node.children) {
      node = Object.values(node.children);
      while (Array.isArray(node)) {
        node = node[0];
      }
    }
    if (typeof node.endOffset != 'number')
      throw new Error('not a token: ' + node);
    if (Number.isNaN(node.startOffset)) {
      return 0;
    }
    return node.startOffset;
  },
  locEnd : function(node: any) : number {
    while (node.children) {
      node = Object.values(node.children);
      while (Array.isArray(node)) {
        node = node[node.length - 1];
      }
    }
    if (typeof node.endOffset != 'number')
      throw new Error('not a token: ' + node);
    if (Number.isNaN(node.endOffset)) {
      return 1;
    }
    return node.endOffset + 1;
  },
};

export const printer = {
  print : function(
              path: prettier.FastPath,
              options: any,
              print: (path: prettier.FastPath) => prettier.Doc,
              ) : prettier.Doc {
    const node = path.getValue();

    if (!node.children) {
      // Canonicalize some of the tokens.
      switch (node.tokenType.name) {
      case 'BeginExecution':
        return 'inicia-ejecución';
      case 'EndExecution':
        return 'termina-ejecución';
      case 'Define':
        return 'define-nueva-instrucción';
      case 'Proto':
        return 'define-prototipo-instrucción';
      case 'Return':
        return 'sal-de-instrucción';
      case 'TurnOff':
        return 'apágate';
      case 'AnyBeepersInBeeperBag':
        return 'algún-zumbador-en-la-mochila';
      case 'NoBeepersInBeeperBag':
        return 'ningún-zumbador-en-la-mochila';
      case 'Else':
        return 'si-no';
      }
      if (node.tokenType.name != 'Identifier') {
        return node.image.toLowerCase();
      }
      return node.image;
    }

    if (node.name == 'program') {
      return builders.group(
          builders.concat([
            path.call(print, 'children', 'BeginProgram', 0),
            builders.indent(
                builders.concat([
                  builders.hardline,
                  node.children.defOrProto
                      ? builders.join(
                            builders.concat(
                                [ builders.hardline, builders.hardline ]),
                            (<prettier.Doc[]>[])
                                .concat(
                                    path.map(print, 'children', 'defOrProto'),
                                    path.map(print, 'children', 'programDef'),
                                    ),
                            )
                      : path.call(print, 'children', 'programDef', 0),
                ]),
                ),
            builders.hardline,
            path.call(print, 'children', 'EndProgram', 0),
            builders.hardline,
          ]),
      );
    } else if (node.name == 'programDef') {
      const statements =
          node.children.statement
              ? (<prettier.Doc[]>[])
                    .concat.apply(
                        <prettier.Doc[]>[],
                        path.map(
                            (pathChild,
                             index) => [builders.hardline,
                                        print(pathChild),
                                        index < node.children.statement.length -
                                                        1 &&
                                                prettier.util.isNextLineEmpty(
                                                    options.originalText,
                                                    pathChild.getValue(),
                                                    options.locEnd,
                                                    )
                                            ? builders.hardline
                                            : '',
      ],
                            'children',
                            'statement',
                            ),
                        )
              : [];
      return builders.concat([
        path.call(print, 'children', 'BeginExecution', 0),
        builders.indent(builders.concat(statements)),
        builders.hardline,
        path.call(print, 'children', 'EndExecution', 0),
      ]);
    } else if (node.name == 'block') {
      const statements =
          (<prettier.Doc[]>[])
              .concat.apply(
                  <prettier.Doc[]>[],
                  node.children.statement
                      ? path.map(
                            (pathChild,
                             index) => [builders.hardline,
                                        print(pathChild),
                                        index < node.children.statement.length -
                                                        1 &&
                                                prettier.util.isNextLineEmpty(
                                                    options.originalText,
                                                    pathChild.getValue(),
                                                    options.locEnd,
                                                    )
                                            ? builders.hardline
                                            : '',
      ],
                            'children',
                            'statement',
                            )
                      : [],
              );
      return builders.concat([
        path.call(print, 'children', 'Begin', 0),
        builders.indent(builders.concat(statements)),
        builders.hardline,
        path.call(print, 'children', 'End', 0),
      ]);
    } else if (node.name == 'proto') {
      return builders.concat([
        path.call(print, 'children', 'Proto', 0),
        ' ',
        node.children.Identifier[0].image,
        node.children.defParam ? path.call(print, 'children', 'defParam', 0)
                               : '',
        path.call(print, 'children', 'Semicolon', 0),
      ]);
    } else if (node.name == 'def') {
      return builders.group(
          builders.concat([
            path.call(print, 'children', 'Define', 0),
            ' ',
            path.call(print, 'children', 'Identifier', 0),
            node.children.defParam ? path.call(print, 'children', 'defParam', 0)
                                   : '',
            ' ',
            path.call(print, 'children', 'As', 0),
            ' ',
            path.call(print, 'children', 'statement', 0),
          ]),
      );
    } else if (node.name == 'cond') {
      let statements = path.map(print, 'children', 'singleStatement');
      const contents = [
        builders.group(
            builders.concat([
              path.call(print, 'children', 'If', 0),
              ' ',
              builders.align('    ', path.call(print, 'children', 'term', 0)),
              ' ',
              path.call(print, 'children', 'Then', 0),
              ' ',
            ]),
            ),
        statements[0],
      ];
      if (statements.length == 2) {
        contents.push(
            builders.concat([
              ' ',
              path.call(print, 'children', 'Else', 0),
              ' ',
            ]),
            statements[1],
        );
      }
      return builders.concat(contents);
    } else if (node.name == 'term') {
      return builders.group(
          builders.join(
              builders.concat([ ' ', 'o', builders.line ]),
              path.map(print, 'children', 'andTerm'),
              ),
      );
    } else if (node.name == 'andTerm') {
      return builders.group(
          builders.join(
              builders.concat([ ' ', 'y', builders.line ]),
              path.map(print, 'children', 'notTerm'),
              ),
      );
    } else if (node.name == 'repeat' || node.name == 'loop' ||
               node.name == 'notTerm') {
      return builders.join(
          ' ',
          Object.keys(node.children)
              .map(
                  (childName) => path.call(print, 'children', childName, 0),
                  ),
      );
    }

    // If we didn't match any other CST node type, use the following generic
    // printer.
    return builders.concat(
        Object.keys(node.children)
            .map(
                (childName) => path.call(print, 'children', childName, 0),
                ),
    );
  },
  isBlockComment : function(node: prettier.AST) :
      boolean { return node.tokenType == 'BlockComment';},
  canAttachComment : function(node: prettier.AST) :
      boolean { return typeof node == 'object' && node.image;},
  printComment : function(
                     commentPath: prettier.FastPath,
                     options: object,
                     ) : prettier.Doc { return commentPath.getValue().image;},
};
