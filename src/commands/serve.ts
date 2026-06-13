import type { Command } from 'commander';
import { logger } from '../utils/index.js';

export function handleServe(options: { port?: number }): void {
  logger.heading('Devora Serve');
  logger.info('Unified docs + sandbox server coming in Phase 2 & 3');
  if (options.port) logger.info(`Port: ${options.port}`);
  logger.info('Run `devora docs` and `devora sandbox` separately in the meantime');
}

export function registerServe(program: Command): void {
  program
    .command('serve')
    .description('Run documentation and sandbox together')
    .option('-p, --port <number>', 'Custom port')
    .action((options: { port?: number }) => {
      handleServe(options);
    });
}
