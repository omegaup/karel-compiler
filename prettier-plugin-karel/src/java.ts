import { java, Token } from 'karel-compiler';
import * as prettier from 'prettier';

const { builders } = prettier.doc;

export const parser = {
  parse: function (text: string, parsers: object, options: any): prettier.AST {
    const cst = java.parse(text, options.filepath);
    // Prettier expects the comment nodes to have the text in the `value`
    // property, not `image`.
    cst.comments = cst.comments.map(
      (
        comment: chevrotain.IToken & { value?: string },
      ): chevrotain.IToken & { value: string } => {
        comment.value = comment.image;
        return <chevrotain.IToken & { value: string }>comment;
      },
    );
    return cst;
  },
  astFormat: 'karel-java-cst',
  locStart: function (node: any): number {
    while (node.children) {
      node = Object.values(node.children);
      while (Array.isArray(node)) {
        node = node[0];
      }
    }
    if (typeof node.startOffset != 'number')
      throw new Error('not a token: ' + node);
    return node.startOffset;
  },
  locEnd: function (node: any): number {
    while (node.children) {
      node = Object.values(node.children);
      while (Array.isArray(node)) {
        node = node[node.length - 1];
      }
    }
    if (typeof node.endOffset != 'number')
      throw new Error('not a token: ' + node);
    return node.endOffset + 1;
  },
};

export const printer = {
  print: function (
    path: prettier.FastPath,
    options: any,
    print: (path: prettier.FastPath) => prettier.Doc,
  ): prettier.Doc {
    const node = path.getValue();

    if (!node.children) {
      return node.image;
    }

    if (node.name == 'programClass') {
      return builders.group(
        builders.concat([
          path.call(print, 'children', 'Class', 0),
          ' ',
          path.call(print, 'children', 'Program', 0),
          ' ',
          path.call(print, 'children', 'LeftBrace', 0),
          builders.indent(
            node.children.def
              ? builders.join(
                  builders.hardline,
                  (<prettier.Doc[]>[]).concat(
                    path.map(print, 'children', 'def'),
                    path.map(print, 'children', 'programDef'),
                  ),
                )
              : path.call(print, 'children', 'programDef', 0),
          ),
          builders.hardline,
          path.call(print, 'children', 'RightBrace', 0),
          builders.hardline,
        ]),
      );
    } else if (node.name == 'programDef') {
      return builders.concat(
        [
          builders.hardline,
          path.call(print, 'children', 'Program', 0),
          path.call(print, 'children', 'LeftParen', 0),
          path.call(print, 'children', 'RightParen', 0),
          ' ',
        ].concat(path.map(print, 'children', 'block')),
      );
    } else if (node.name == 'def') {
      return builders.concat(
        [
          builders.hardline,
          path.call(print, 'children', 'Define', 0),
          ' ',
          node.children.Identifier[0].image,
          path.call(print, 'children', 'defParam', 0),
          ' ',
        ].concat(path.map(print, 'children', 'block')),
      );
    } else if (node.name == 'block') {
      if (!node.children.statement) {
        return builders.concat([
          path.call(print, 'children', 'LeftBrace', 0),
          path.call(print, 'children', 'RightBrace', 0),
        ]);
      }
      const statements = (<prettier.Doc[]>[]).concat.apply(
        <prettier.Doc[]>[],
        path.map(
          (pathChild, index) => [
            builders.hardline,
            print(pathChild),
            index < node.children.statement.length - 1 &&
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
      );
      return builders.concat([
        path.call(print, 'children', 'LeftBrace', 0),
        builders.indent(builders.concat(statements)),
        builders.hardline,
        path.call(print, 'children', 'RightBrace', 0),
      ]);
    } else if (node.name == 'repeat') {
      const parts: prettier.Doc[] = [
        builders.concat([
          path.call(print, 'children', 'Iterate', 0),
          ' ',
          path.call(print, 'children', 'LeftParen', 0),
          builders.group(
            builders.concat([
              builders.align(
                '       ',
                path.call(print, 'children', 'integer', 0),
              ),
              builders.softline,
            ]),
          ),
          path.call(print, 'children', 'RightParen', 0),
        ]),
      ];
      if (node.children.statement[0].children.block) {
        parts.push(' ', path.call(print, 'children', 'statement', 0));
      } else {
        // If the statement is not a block, we need to proactively try to indent
        // if it doesn't fit.
        parts.push(
          builders.group(
            builders.indent(
              builders.concat([
                builders.line,
                path.call(print, 'children', 'statement', 0),
              ]),
            ),
          ),
        );
      }
      return builders.concat(parts);
    } else if (node.name == 'loop') {
      const parts: prettier.Doc[] = [
        builders.concat([
          path.call(print, 'children', 'While', 0),
          ' ',
          path.call(print, 'children', 'LeftParen', 0),
          builders.group(
            builders.concat([
              builders.align(
                '       ',
                path.call(print, 'children', 'term', 0),
              ),
              builders.softline,
            ]),
          ),
          path.call(print, 'children', 'RightParen', 0),
        ]),
      ];
      if (node.children.statement[0].children.block) {
        parts.push(' ', path.call(print, 'children', 'statement', 0));
      } else {
        // If the statement is not a block, we need to proactively try to indent
        // if it doesn't fit.
        parts.push(
          builders.group(
            builders.indent(
              builders.concat([
                builders.line,
                path.call(print, 'children', 'statement', 0),
              ]),
            ),
          ),
        );
      }
      return builders.concat(parts);
    } else if (node.name == 'term') {
      return builders.group(
        builders.join(
          builders.concat([' ', '||', builders.line]),
          path.map(print, 'children', 'andTerm'),
        ),
      );
    } else if (node.name == 'andTerm') {
      return builders.group(
        builders.join(
          builders.concat([' ', '&&', builders.line]),
          path.map(print, 'children', 'notTerm'),
        ),
      );
    } else if (node.name == 'clause') {
      if (node.children.term) {
        return builders.group(
          builders.concat([
            path.call(print, 'children', 'LeftParen', 0),
            builders.align(' ', path.call(print, 'children', 'term', 0)),
            path.call(print, 'children', 'RightParen', 0),
          ]),
        );
      }
      // Fall through to use the generic printer.
    } else if (node.name == 'cond') {
      let statements = path.map(print, 'children', 'statement');
      const parts: prettier.Doc[] = [
        builders.concat([
          path.call(print, 'children', 'If', 0),
          ' ',
          path.call(print, 'children', 'LeftParen', 0),
          builders.group(
            builders.concat([
              builders.align('    ', path.call(print, 'children', 'term', 0)),
              builders.softline,
            ]),
          ),
          path.call(print, 'children', 'RightParen', 0),
        ]),
      ];
      if (node.children.statement[0].children.block) {
        parts.push(' ', statements[0]);
        if (statements.length == 2) parts.push(' ');
      } else if (statements.length == 2) {
        // The statement is not a block, and there is an else block. Force a
        // newline in this case.
        parts.push(
          builders.indent(builders.concat([builders.hardline, statements[0]])),
        );
        if (statements.length == 2) parts.push(builders.hardline);
      } else {
        // If the statement is not a block, we need to proactively try to indent
        // if it doesn't fit.
        parts.push(
          builders.group(
            builders.indent(builders.concat([builders.line, statements[0]])),
          ),
        );
        if (statements.length == 2) parts.push(builders.hardline);
      }
      if (statements.length == 2) {
        parts.push(builders.concat([path.call(print, 'children', 'Else', 0)]));
        if (
          node.children.statement[1].children.block ||
          node.children.statement[1].children.cond
        ) {
          parts.push(' ', statements[1]);
        } else {
          // Since the if block was indented, might as well also indent the
          // else block.
          parts.push(
            builders.indent(
              builders.concat([builders.hardline, statements[1]]),
            ),
          );
        }
      }
      return builders.concat(parts);
    }

    // If we didn't match any other CST node type, use the following generic
    // printer.
    return builders.concat(
      Object.keys(node.children).map((childName) =>
        path.call(print, 'children', childName, 0),
      ),
    );
  },
  isBlockComment: function (node: prettier.AST): boolean {
    return node.tokenType == 'BlockComment';
  },
  canAttachComment: function (node: prettier.AST): boolean {
    return typeof node == 'object' && node.image;
  },
  printComment: function (
    commentPath: prettier.FastPath,
    options: object,
  ): prettier.Doc {
    return commentPath.getValue().image;
  },
};
