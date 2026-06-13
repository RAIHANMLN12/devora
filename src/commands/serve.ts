import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Command } from 'commander';
import { logger, resolvePort } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { startDocsServer } from '../server/index.js';

export async function handleServe(options: { port?: number }): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const port = resolvePort(options.port, config.docs.port, 3456);
  const specPath = resolve(cwd, '.devora/openapi.json');

  if (!existsSync(specPath)) {
    logger.heading('Devora Serve');
    logger.error('No OpenAPI spec found. Run `devora scan .` first.');
    return;
  }

  logger.heading('Devora Serve');

  const server = await startDocsServer({
    port,
    specPath,
    sandbox: {
      mode: config.sandbox.mock ? 'mock' : 'proxy',
      proxyTarget: config.sandbox.proxyTarget === 'auto' ? undefined : config.sandbox.proxyTarget,
    },
    open: true,
  });

  logger.info(`Docs:    http://localhost:${port}`);
  logger.info(`Sandbox: http://localhost:${port} (use the Test button on any endpoint)`);

  process.on('SIGINT', () => { server.close(); process.exit(0); });
  process.on('SIGTERM', () => { server.close(); process.exit(0); });
}

export function registerServe(program: Command): void {
  program
    .command('serve')
    .description('Run documentation and sandbox together')
    .option('-p, --port <number>', 'Custom port')
    .action(async (options: { port?: number }) => {
      await handleServe(options);
    });
}
