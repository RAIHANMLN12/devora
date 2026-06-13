import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Command } from 'commander';
import { logger, resolvePort } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { startDocsServer } from '../server/index.js';

export async function handleDocs(options: { open?: boolean; port?: number }): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const port = resolvePort(options.port, config.docs.port, 3456);
  const specPath = resolve(cwd, '.devora/openapi.json');

  if (!existsSync(specPath)) {
    logger.heading('Devora Docs');
    logger.error('No OpenAPI spec found. Run `devora scan .` first.');
    return;
  }

  logger.heading('Devora Docs');
  const server = await startDocsServer({ port, specPath, open: options.open });

  // Keep the process alive
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });
}

export function registerDocs(program: Command): void {
  program
    .command('docs')
    .description('Generate and serve interactive API documentation')
    .option('--open', 'Auto-open browser')
    .option('-p, --port <number>', 'Custom port')
    .option('-e, --export <format>', 'Export as static HTML or Markdown (coming soon)')
    .action(async (options: { open?: boolean; port?: number }) => {
      await handleDocs(options);
    });
}
