import type { Command } from 'commander';
import { logger } from '../utils/index.js';

export function handleSandbox(options: { port?: number; mock?: boolean }): void {
  logger.heading('Devora Sandbox');
  logger.info('Interactive sandbox coming in Phase 3');
  if (options.port) logger.info(`Port: ${options.port}`);
  if (options.mock) logger.info('Mock mode: enabled');
}

export function registerSandbox(program: Command): void {
  program
    .command('sandbox')
    .description('Start interactive API testing environment')
    .option('-p, --port <number>', 'Custom port')
    .option('-m, --mock', 'Use mock responses instead of real server')
    .action((options: { port?: number; mock?: boolean }) => {
      handleSandbox(options);
    });
}
