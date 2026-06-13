import type { Command } from 'commander';
import { logger } from '../utils/index.js';

export function handleDocs(options: { open?: boolean; port?: number; export?: string }): void {
  logger.heading('Devora Docs');
  logger.info('Documentation UI coming in Phase 2');
  if (options.open) logger.info('Auto-open: enabled');
  if (options.port) logger.info(`Port: ${options.port}`);
  if (options.export) logger.info(`Export format: ${options.export}`);
}

export function registerDocs(program: Command): void {
  program
    .command('docs')
    .description('Generate and serve interactive API documentation')
    .option('--open', 'Auto-open browser')
    .option('-p, --port <number>', 'Custom port')
    .option('-e, --export <format>', 'Export as static HTML or Markdown')
    .action((options: { open?: boolean; port?: number; export?: string }) => {
      handleDocs(options);
    });
}
