import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import type { OpenApiSpec } from '../types/index.js';

export interface SandboxRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  mode: 'proxy' | 'mock';
  target?: string;
}

export interface SandboxResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  timingMs: number;
  error?: string;
}

export function buildTargetUrl(target: string, path: string, query: Record<string, string>): string {
  const base = target.replace(/\/+$/, '');
  const qs = Object.entries(query)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${base}${path}${qs ? '?' + qs : ''}`;
}

export function executeProxyRequest(options: {
  target: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
}): Promise<SandboxResponse> {
  const urlStr = buildTargetUrl(options.target, options.path, options.query);
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const requester = isHttps ? httpsRequest : httpRequest;

  const startTime = Date.now();

  return new Promise((resolve) => {
    const req = requester(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          ...options.headers,
          host: url.host,
        },
        timeout: 30000,
      },
      (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const timingMs = Date.now() - startTime;
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (v) headers[k] = Array.isArray(v) ? v.join(', ') : v;
          }
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({ statusCode: proxyRes.statusCode || 502, headers, body, timingMs });
        });
      }
    );

    req.on('error', (err) => {
      const timingMs = Date.now() - startTime;
      resolve({
        statusCode: 502,
        headers: {},
        body: '',
        timingMs,
        error: `Proxy error: ${err.message}`,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const timingMs = Date.now() - startTime;
      resolve({
        statusCode: 504,
        headers: {},
        body: '',
        timingMs,
        error: 'Proxy timeout (30s)',
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
