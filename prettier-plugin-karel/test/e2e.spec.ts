import 'mocha';

import { expect } from 'chai';

import * as fs from 'fs';
import { basename, relative, resolve } from 'path';

import * as prettier from 'prettier';
import * as karelPlugin from '../src';

function format(
  filepath: string,
  inputContents: string,
  dialect: string,
): string {
  try {
    return prettier.format(inputContents, {
      // @ts-ignore This needs to be the name, or the printer won't be selected.
      parser: `karel-${dialect}`,
      plugins: [karelPlugin],
      filepath: filepath,
    });
  } catch (e) {
    console.error(e);
    return '';
  }
}

function readDirRecursive(testFolder: string, extension: string): string[] {
  const result: string[] = [];
  for (const dirent of fs.readdirSync(testFolder, { withFileTypes: true })) {
    if (dirent.name == '.' || dirent.name == '..') {
      continue;
    }
    const path = resolve(testFolder, dirent.name);
    if (dirent.isDirectory()) {
      result.splice(result.length, 0, ...readDirRecursive(path, extension));
      continue;
    }
    if (
      dirent.name.substring(dirent.name.length - extension.length) !== extension
    ) {
      continue;
    }
    result.push(path);
  }
  return result;
}

for (const [dialect, extension] of [
  ['java', 'kj'],
  ['pascal', 'kp'],
]) {
  const inputExtension = `.in.${extension}`;
  const outputExtension = `.out.${extension}`;
  describe(dialect, function () {
    const dialectDirectory = resolve(__dirname, dialect);
    for (const inputPath of readDirRecursive(
      dialectDirectory,
      inputExtension,
    )) {
      const prunedPath = inputPath.substring(
        0,
        inputPath.length - inputExtension.length,
      );
      const expectedPath = `${prunedPath}${outputExtension}`;
      describe(relative(dialectDirectory, prunedPath), function () {
        let inputContents: string = '';
        let expectedContents: string = '';

        before(function () {
          inputContents = fs.readFileSync(inputPath, 'utf8');
          expectedContents = fs.readFileSync(expectedPath, 'utf8');
        });

        it(`can be formatted`, function () {
          const actual = format(inputPath, inputContents, dialect);
          expect(actual).to.equal(expectedContents);
        });

        it(`has an idempotent formatting`, function () {
          const onePass = format(inputPath, inputContents, dialect);
          const secondPass = format(`${inputPath}.2`, onePass, dialect);
          expect(onePass).to.equal(secondPass);
        });
      });
    }
  });
}
