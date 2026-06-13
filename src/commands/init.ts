import { resolve } from 'path';
import { detectProject } from '../detector/index.js';
import { getDefaultConfig, writeConfig } from '../config/index.js';
import { logger, createSpinner } from '../utils/index.js';
import type { DevoraConfig, DetectionResult } from '../types/index.js';
import type { Command } from 'commander';

function buildConfigFromDetection(detection: DetectionResult): DevoraConfig {
  const config = getDefaultConfig();
  config.scan.framework = detection.framework;

  if (detection.language === 'python') {
    config.scan.include = ['**/*.py'];
  }

  return config;
}

export async function handleInit(cwd: string): Promise<void> {
  const spinner = createSpinner('Analyzing project...');
  spinner.start();

  const detection = detectProject(cwd);

  if (!detection) {
    spinner.fail('Could not detect a supported framework.');
    logger.info('Supported: Express, Fastify, FastAPI, Flask');
    logger.info('Creating default configuration...');
  } else {
    spinner.succeed(`Detected: ${detection.framework} (${detection.language}, confidence: ${Math.round(detection.confidence * 100)}%)`);
  }

  const config = detection ? buildConfigFromDetection(detection) : getDefaultConfig();
  const spinner2 = createSpinner('Writing .devora/config...');
  spinner2.start();

  const configPath = writeConfig(cwd, config);
  spinner2.succeed(`Configuration written to ${resolve(cwd, '.devora/config')}`);

  logger.heading('Getting Started');
  logger.info('Run `devora scan .` to generate API documentation');
  logger.info('Run `devora docs` to view documentation');
  logger.info('Run `devora serve` to start docs + sandbox');
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Analyze repository and generate .devora/config')
    .argument('[path]', 'Project path', '.')
    .action(async (path: string) => {
      const cwd = resolve(process.cwd(), path);
      await handleInit(cwd);
    });
}
