import { resolve } from 'path';
import type { Command } from 'commander';
import { logger } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { detectProject } from '../detector/index.js';

export async function handleScan(
  path: string,
  options: { serve?: boolean; output?: string; llm?: boolean }
): Promise<void> {
  const cwd = resolve(process.cwd(), path);
  const config = await loadConfig(cwd);
  const detection = detectProject(cwd);

  logger.heading('Devora Scan');
  if (detection) {
    logger.success(`Detected: ${detection.framework} (${detection.language})`);
  } else {
    logger.warn('Could not detect a supported framework');
    logger.info('Run `devora init` to set up configuration');
  }

  logger.info('Scanner coming in Phase 1');
  logger.info(`Scan path: ${cwd}`);
  logger.info(`Framework: ${config.scan.framework}`);
  if (options.llm) logger.info('LLM enrichment: enabled');
  if (options.serve) logger.info('Auto-serve: enabled');
  if (options.output) logger.info(`Output: ${options.output}`);
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
