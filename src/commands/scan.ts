import { resolve } from 'path';
import type { Command } from 'commander';
import { logger, createSpinner, resolvePort } from '../utils/index.js';
import { scan as runScan } from '../scanner/index.js';
import { loadConfig } from '../config/index.js';
import { startDocsServer } from '../server/index.js';

export async function handleScan(
  path: string,
  options: { serve?: boolean; output?: string; llm?: boolean }
): Promise<void> {
  const cwd = resolve(process.cwd(), path);
  const spinner = createSpinner('Scanning project...');
  spinner.start();

  try {
    const result = await runScan(cwd, { llm: options.llm });

    spinner.succeed(
      `Found ${result.routesCount} routes across ${result.filesCount} file${result.filesCount !== 1 ? 's' : ''}`
    );

    logger.success(`Detected: ${result.framework} (${result.language})`);
    logger.success(`Generated OpenAPI spec → ${result.outputPath}`);

    if (result.enrichedCount > 0) {
      logger.success(`LLM enrichment: ${result.enrichedCount}/${result.totalCount} routes enriched (${result.llmProvider}/${result.llmModel})`);
    } else if (result.totalCount > 0) {
      logger.info('LLM enrichment: not available (set LLM_API_KEY or OPENAI_API_KEY in .env to enable)');
    }

    // --serve: automatically start docs server
    if (options.serve) {
      const config = await loadConfig(cwd);
      const port = resolvePort(undefined, config.docs.port, 3456);
      const specPath = resolve(cwd, '.devora/openapi.json');
      logger.heading('Starting Documentation Server');
      const server = await startDocsServer({ port, specPath, open: true });
      process.on('SIGINT', () => { server.close(); process.exit(0); });
      process.on('SIGTERM', () => { server.close(); process.exit(0); });
      return; // keep process alive
    }

    logger.heading('Next Steps');
    logger.info('Run `devora docs --open` to view interactive documentation');
    logger.info('Run `devora sandbox` to test endpoints interactively');
    logger.info('Run `devora serve` to run docs + sandbox together');
  } catch (err) {
    spinner.fail('Scan failed');
    logger.error(err instanceof Error ? err.message : String(err));
  }
}

export function registerScan(program: Command): void {
  program
    .command('scan')
    .description('Scan source files and generate OpenAPI specification')
    .argument('[path]', 'Project path', '.')
    .option('--serve', 'Scan and immediately serve documentation')
    .option('-o, --output <path>', 'Custom output path for OpenAPI spec')
    .option('--llm', 'Force LLM enrichment')
    .action(async (path: string, options: { serve?: boolean; output?: string; llm?: boolean }) => {
      await handleScan(path, options);
    });
}
