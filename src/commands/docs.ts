import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { Command } from 'commander';
import { logger, resolvePort } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { startDocsServer } from '../server/index.js';
import { generateStaticHtml } from '../export/index.js';
import type { OpenApiSpec } from '../types/index.js';

export async function handleDocs(options: { open?: boolean; port?: number; export?: string }): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const specPath = resolve(cwd, '.devora/openapi.json');

  if (!existsSync(specPath)) {
    logger.heading('Devora Docs');
    logger.error('No OpenAPI spec found. Run `devora scan .` first.');
    return;
  }

  // Export mode
  if (options.export) {
    const format = options.export.toLowerCase();
    if (format === 'html' || format === 'true') {
      const outputPath = resolve(cwd, '.devora/docs/index.html');
      let spec: OpenApiSpec;
      try {
        spec = JSON.parse(readFileSync(specPath, 'utf-8'));
      } catch {
        logger.error('Failed to parse OpenAPI spec.');
        return;
      }
      generateStaticHtml(spec, outputPath);
      logger.success(`Static HTML exported to ${outputPath}`);
      logger.info('Open this file in any browser, or serve it with any HTTP server');
    } else {
      logger.error(`Unsupported export format: ${format}. Supported: html`);
    }
    return;
  }

  // Serve mode
  const port = resolvePort(options.port, config.docs.port, 3456);

  logger.heading('Devora Docs');
  const server = await startDocsServer({ port, specPath, open: options.open });

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
    .option('-e, --export <format>', 'Export as static HTML')
    .action(async (options: { open?: boolean; port?: number; export?: string }) => {
      await handleDocs(options);
    });
}
