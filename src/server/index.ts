import express from 'express';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createServer, type Server } from 'http';
import { logger } from '../utils/index.js';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  specPath: string;
  open?: boolean;
}

export async function startDocsServer(options: ServerOptions): Promise<Server> {
  const app = express();

  app.get('/openapi.json', (_req, res) => {
    try {
      const content = readFileSync(options.specPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(content);
    } catch {
      res.status(404).json({ error: 'OpenAPI spec not found' });
    }
  });

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
      logger.success(`Documentation server running at http://localhost:${options.port}`);
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
