import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'path';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { scan } from '../src/scanner/index.js';

const TEST_DIR = resolve(process.cwd(), 'test/.scan-integration-test');

beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  // Create a minimal Express project matching default scan patterns
  const srcDir = resolve(TEST_DIR, 'src');
  mkdirSync(srcDir, { recursive: true });

  writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'scan-test',
    dependencies: { express: '^4.18.0' },
  }));
  writeFileSync(resolve(srcDir, 'app.js'), `
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users', (req, res) => {
  res.json({ users: [] });
});

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Test' });
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ id: 1, name, email });
});
module.exports = app;
  `);
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('scanner integration', () => {
  it('scans an Express project end-to-end', async () => {
    const result = await scan(TEST_DIR);

    expect(result.framework).toBe('express');
    expect(result.language).toBe('javascript');
    expect(result.routesCount).toBe(4);
    expect(result.filesCount).toBe(1);
    expect(result.outputPath).toContain('.devora');
    expect(existsSync(result.outputPath)).toBe(true);
  });

  it('generates valid OpenAPI JSON file', async () => {
    const result = await scan(TEST_DIR);
    const fs = await import('fs');
    const content = fs.readFileSync(result.outputPath, 'utf-8');
    const spec = JSON.parse(content);

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.paths['/health']).toBeDefined();
    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/users/{id}']).toBeDefined();
    expect(spec.paths['/users'].get).toBeDefined();
    expect(spec.paths['/users'].post).toBeDefined();
    // POST /users should have requestBody
    expect(spec.paths['/users'].post.requestBody).toBeDefined();
  });
});
