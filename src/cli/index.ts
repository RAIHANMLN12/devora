import { Command } from 'commander';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { registerInit } from '../commands/init.js';
import { registerScan } from '../commands/scan.js';
import { registerDocs } from '../commands/docs.js';
import { registerSandbox } from '../commands/sandbox.js';
import { registerServe } from '../commands/serve.js';
import { registerWatch } from '../commands/watch.js';

const require = createRequire(import.meta.url);
let pkg: { version: string; description: string };

try {
  pkg = require('../package.json');
} catch {
  pkg = { version: '0.0.0', description: 'Scan, document, and test any API repository' };
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('devora')
    .description(pkg.description)
    .version(pkg.version, '-v, --version', 'Output the current version');

  registerInit(program);
  registerScan(program);
  registerDocs(program);
  registerSandbox(program);
  registerServe(program);
  registerWatch(program);

  program.addHelpText('after', `
Examples:
  $ devora init              Analyze repo and generate config
  $ devora scan .            Scan project and generate OpenAPI spec
  $ devora docs --open       View API documentation in browser
  $ devora sandbox           Start interactive API testing
  $ devora serve             Run docs and sandbox together
  $ devora watch .           Watch files and auto-regenerate

Learn more: https://devora.sh
  `);

  return program;
}
