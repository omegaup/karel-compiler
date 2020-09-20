[![Github Actions Build Status][github-actions-image]][gitub-actions-main]

[github-actions-image]: https://github.com/omegaup/karel-compiler/workflows/ci/badge.svg
[gitub-actions-main]: https://github.com/omegaup/karel-compiler/actions

# Karel Compiler

This is a new implementation of the [Karel](https://omegaup.com/karel.js) compiler.

## Subpackages

This project contains 2 packages:

- [prettier-plugin-karel](./packages/prettier-plugin-karel) A plugin for
  [Prettier](https://prettier.io/) to format Karel code

  [![npm-prettier-plugin-karel][npm-prettier-plugin-karel-image]][npm-prettier-plugin-karel-url]

- [karel-compiler](./packages/karel-compiler) A Karel Parser and Compiler using
  [Chevrotain](https://github.com/SAP/chevrotain) which outputs a **C**oncrete
  **S**yntax **T**ree

  [![npm-karel-compiler][npm-karel-compiler-image]][npm-karel-compiler-url]

[npm-prettier-plugin-karel-image]: https://img.shields.io/npm/v/prettier-plugin-karel.svg?color=blue&label=prettier-plugin-karel&logo=prettier-plugin-karel
[npm-prettier-plugin-karel-url]: https://www.npmjs.com/package/prettier-plugin-karel
[npm-karel-compiler-image]: https://img.shields.io/npm/v/karel-compiler.svg?color=blue&label=karel-compiler&logo=karel-compiler
[npm-karel-compiler-url]: https://www.npmjs.com/package/karel-compiler
