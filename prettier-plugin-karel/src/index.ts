import * as java from './java';
import * as pascal from './pascal';

export const languages = [
  {
    name: 'karel-java',
    parsers: ['karel-java'],
    group: 'karel',
    extensions: ['.kj'],
  },
  {
    name: 'karel-pascal',
    parsers: ['karel-pascal'],
    group: 'karel',
    extensions: ['.kp'],
  },
];

export const parsers = {
  'karel-pascal': pascal.parser,
  'karel-java': java.parser,
};

export const printers = {
  'karel-pascal-cst': pascal.printer,
  'karel-java-cst': java.printer,
};
