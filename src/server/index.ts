import express from 'express';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createServer, type Server } from 'http';
import { logger } from '../utils/index.js';
import { fileURLToPath } from 'url';
import { executeProxyRequest, type SandboxRequest } from '../sandbox/engine.js';
import { generateMockResponse } from '../sandbox/mocker.js';
import type { OpenApiSpec } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  specPath: string;
  open?: boolean;
  sandbox?: {
    mode: 'proxy' | 'mock';
    proxyTarget?: string;
  };
}

function loadSpec(specPath: string): OpenApiSpec | null {
  try {
    return JSON.parse(readFileSync(specPath, 'utf-8'));
  } catch {
    return null;
  }
}

export async function startDocsServer(options: ServerOptions): Promise<Server> {
  const app = express();
  app.use(express.text({ type: '*/*', limit: '10mb' }));

  // Serve openapi.json
  app.get('/openapi.json', (_req, res) => {
    try {
      const content = readFileSync(options.specPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(content);
    } catch {
      res.status(404).json({ error: 'OpenAPI spec not found' });
    }
  });

  // Sandbox execute API
  app.post('/api/sandbox/execute', async (req, res) => {
    const spec = loadSpec(options.specPath);
    if (!spec) {
      res.status(404).json({ error: 'No OpenAPI spec found. Run devora scan first.' });
      return;
    }

    let sandboxReq: SandboxRequest;
    try {
      sandboxReq = JSON.parse(req.body as string);
    } catch {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    if (!sandboxReq.method || !sandboxReq.path) {
      res.status(400).json({ error: 'method and path are required' });
      return;
    }

    const mode = sandboxReq.mode || options.sandbox?.mode || 'mock';

    if (mode === 'mock') {
      const mock = generateMockResponse(spec, sandboxReq.method.toLowerCase(), sandboxReq.path);
      res.json({
        statusCode: mock.statusCode,
        headers: mock.headers,
        body: mock.body,
        timingMs: mock.timingMs,
        mode: 'mock',
      });
      return;
    }

    if (mode === 'proxy') {
      const target = sandboxReq.target || options.sandbox?.proxyTarget;
      if (!target) {
        res.status(400).json({
          error: 'No proxy target configured. Specify a target or use mock mode.',
          hint: 'Set proxyTarget in .devora/config or pass --mock to use mock responses',
        });
        return;
      }

      const result = await executeProxyRequest({
        target,
        method: sandboxReq.method,
        path: sandboxReq.path,
        query: sandboxReq.query || {},
        headers: sandboxReq.headers || {},
        body: sandboxReq.body,
      });

      res.json({
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body,
        timingMs: result.timingMs,
        error: result.error,
        mode: 'proxy',
        target,
      });
      return;
    }

    res.status(400).json({ error: `Unknown mode: ${mode}` });
  });

  // Serve the built UI
  const uiDir = resolve(__dirname, '../../build/ui');
  if (existsSync(uiDir)) {
    app.use(express.static(uiDir, { index: 'index.html' }));
  } else {
    app.get('/', (_req, res) => {
      res.send('Devora documentation UI not built. Run `npm run build` first.');
    });
  }

  return new Promise((resolvePromise, reject) => {
    const server = createServer(app);
    server.listen(options.port, '127.0.0.1', () => {
      const mode = options.sandbox?.mode || 'docs-only';
      if (mode === 'docs-only') {
        logger.success(`Documentation server running at http://localhost:${options.port}`);
      } else {
        logger.success(`Devora server running at http://localhost:${options.port}`);
        logger.info(`Sandbox mode: ${mode}${mode === 'proxy' && options.sandbox?.proxyTarget ? ` → ${options.sandbox.proxyTarget}` : ''}`);
      }
      if (options.open) {
        import('child_process').then((cp) => {
          cp.exec(`start http://localhost:${options.port}`);
        });
      }
      resolvePromise(server);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${options.port} is already in use. Try a different port with --port.`));
      } else {
        reject(err);
      }
    });
  });
}
