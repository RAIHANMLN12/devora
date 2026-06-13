import { resolve } from 'path';
import type { Command } from 'commander';
import { logger } from '../utils/index.js';

export function handleWatch(path: string): void {
  const cwd = resolve(process.cwd(), path);
  logger.heading('Devora Watch');
  logger.info('Watch mode coming in Phase 6');
  logger.info(`Watch path: ${cwd}`);
  logger.info('This command will auto-regenerate docs when source files change');
}

export function registerWatch(program: Command): void {
  program
    .command('watch')
    .description('Watch source files and auto-regenerate documentation')
    .argument('[path]', 'Project path', '.')
    .action(async (path: string) => {
      handleWatch(path);
    });
}
