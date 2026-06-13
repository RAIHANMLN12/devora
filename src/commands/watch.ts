import { resolve } from 'path';
import type { Command } from 'commander';
import { watch as chokidarWatch } from 'chokidar';
import { logger } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { detectProject } from '../detector/index.js';
import { scan } from '../scanner/index.js';

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export async function handleWatch(path: string): Promise<void> {
  const cwd = resolve(process.cwd(), path);
  const config = await loadConfig(cwd);
  const detection = detectProject(cwd);

  if (!detection) {
    logger.error('Could not detect a supported framework. Run `devora init` first.');
    return;
  }

  const defaults = detection.language === 'python' ? ['**/*.py'] : config.scan.include;
  const includePatterns = defaults.map((p) => resolve(cwd, p));

  logger.heading('Devora Watch');
  logger.info(`Watching ${includePatterns.length} pattern(s) in ${cwd}`);
  logger.info('Press Ctrl+C to stop');

  // Initial scan
  logger.info('Running initial scan...');
  try {
    const result = await scan(cwd);
    logger.success(`Initial scan: ${result.routesCount} routes found`);
  } catch (err) {
    logger.error(`Initial scan failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Watch for changes
  const watcher = chokidarWatch(includePatterns, {
    ignored: ['**/node_modules/**', '**/.devora/**', '**/__pycache__/**', '**/.git/**'],
    ignoreInitial: true,
    persistent: true,
  });

  const doScan = debounce(async () => {
    logger.info('File change detected, re-scanning...');
    try {
      const result = await scan(cwd);
      logger.success(`Re-scan complete: ${result.routesCount} routes`);
    } catch (err) {
      logger.error(`Re-scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, 500);

  watcher.on('add', (file) => { logger.info(`Added: ${file}`); doScan(); });
  watcher.on('change', (file) => { logger.info(`Changed: ${file}`); doScan(); });
  watcher.on('unlink', (file) => { logger.info(`Removed: ${file}`); doScan(); });

  process.on('SIGINT', () => {
    logger.info('Stopping watch...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watcher.close();
    process.exit(0);
  });
}

export function registerWatch(program: Command): void {
  program
    .command('watch')
    .description('Watch source files and auto-regenerate documentation')
    .argument('[path]', 'Project path', '.')
    .action(async (path: string) => {
      await handleWatch(path);
    });
}
