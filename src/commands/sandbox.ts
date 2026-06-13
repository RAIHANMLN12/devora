import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Command } from 'commander';
import { logger, resolvePort } from '../utils/index.js';
import { loadConfig } from '../config/index.js';
import { startDocsServer } from '../server/index.js';
import { detectProject } from '../detector/index.js';

async function detectProxyTarget(cwd: string): Promise<string | undefined> {
  const detection = detectProject(cwd);
  if (!detection) return undefined;

  const pkgPath = resolve(cwd, 'package.json');
  try {
    const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'));
    const scripts = pkg.scripts || {};
    // Try to detect the dev server port from common patterns
    const startScripts = [scripts.dev, scripts.start, scripts.serve].filter(Boolean);
    for (const script of startScripts) {
      const portMatch = script.match(/--port\s*(\d+)/) || script.match(/:(\d{4})\b/) || script.match(/PORT=(\d+)/);
      if (portMatch) return `http://localhost:${portMatch[1]}`;
    }
  } catch {}
  return detection.language === 'python' ? 'http://localhost:8000' : 'http://localhost:3000';
}

export async function handleSandbox(options: { port?: number; mock?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const port = resolvePort(options.port, config.sandbox.port, 3457);
  const specPath = resolve(cwd, '.devora/openapi.json');

  if (!existsSync(specPath)) {
    logger.heading('Devora Sandbox');
    logger.error('No OpenAPI spec found. Run `devora scan .` first.');
    return;
  }

  const useMock = options.mock ?? config.sandbox.mock;

  let proxyTarget: string | undefined;
  if (!useMock) {
    proxyTarget = config.sandbox.proxyTarget === 'auto'
      ? await detectProxyTarget(cwd)
      : config.sandbox.proxyTarget;
  }

  logger.heading('Devora Sandbox');

  const server = await startDocsServer({
    port,
    specPath,
    sandbox: {
      mode: useMock ? 'mock' : 'proxy',
      proxyTarget: useMock ? undefined : proxyTarget,
    },
    open: true,
  });

  if (!useMock && proxyTarget) {
    logger.info(`Proxying to ${proxyTarget}`);
    logger.info(`Make sure your dev server is running on ${proxyTarget}`);
  }

  process.on('SIGINT', () => { server.close(); process.exit(0); });
  process.on('SIGTERM', () => { server.close(); process.exit(0); });
}

export function registerSandbox(program: Command): void {
  program
    .command('sandbox')
    .description('Start interactive API testing environment')
    .option('-p, --port <number>', 'Custom port')
    .option('-m, --mock', 'Use mock responses instead of real server')
    .action(async (options: { port?: number; mock?: boolean }) => {
      await handleSandbox(options);
    });
}
