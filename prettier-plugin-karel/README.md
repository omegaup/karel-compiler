# `prettier-plugin-karel`

This is a plugin for [Prettier](https://prettier.io) that can auto-format
[Karel](https://omegaup.com/karel.js) files. It uses the [Chevrotain Parser
Building Toolkit for JavaScript](https://github.com/SAP/chevrotain).

# Install

## Pre-requirements

- Node version 10+
- Prettier

## Install Prettier and `prettier-plugin-karel`

```shell
# Local installation
npm install prettier-plugin-karel --save-dev

# Or globally
npm install -g prettier prettier-plugin-karel
```

or with yarn:

```shell
# Local installation
yarn add prettier-plugin-karel --dev

# Or globally
yarn global add prettier prettier-plugin-karel
```

Note: If you want to install `prettier-plugin-karel` globally, you should also
install the `prettier` package globally.

# Usage

To reformat all your Karel files, run:

```shell
# If you have installed the package locally
npx prettier --write "**/*.kj" "**/*.kp"

# Or globally
prettier --write "**/*.kj" "**/*.kp"
```
