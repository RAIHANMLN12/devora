import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { getDefaultConfig, loadConfig, writeConfig } from '../src/config/index.js';

let tempDir: string;

beforeEach(() => {
  tempDir = resolve(tmpdir(), `devora-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('config', () => {
  describe('getDefaultConfig', () => {
    it('returns a valid config object', () => {
      const config = getDefaultConfig();
      expect(config.version).toBe(1);
      expect(config.scan.framework).toBe('auto');
      expect(config.llm.temperature).toBe(0.2);
      expect(config.docs.port).toBe(3456);
      expect(config.sandbox.port).toBe(3457);
    });

    it('returns a deep clone (not a reference)', () => {
      const a = getDefaultConfig();
      const b = getDefaultConfig();
      a.scan.framework = 'express';
      expect(b.scan.framework).toBe('auto');
    });
  });

  describe('loadConfig', () => {
    it('returns defaults when no config exists', async () => {
      const config = await loadConfig(tempDir);
      expect(config.scan.framework).toBe('auto');
    });

    it('loads config from .devora/config (JSON)', async () => {
      const configDir = resolve(tempDir, '.devora');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(resolve(configDir, 'config.json'), JSON.stringify({
        scan: { framework: 'express' },
        docs: { port: 9000 },
      }));

      const config = await loadConfig(tempDir);
      expect(config.scan.framework).toBe('express');
      expect(config.docs.port).toBe(9000);
      // other fields should remain defaults
      expect(config.llm.temperature).toBe(0.2);
    });

    it('loads config from package.json devora key', async () => {
      writeFileSync(resolve(tempDir, 'package.json'), JSON.stringify({
        devora: { docs: { theme: 'light' } },
      }));

      const config = await loadConfig(tempDir);
      expect(config.docs.theme).toBe('light');
    });
  });

  describe('writeConfig', () => {
    it('creates .devora/config with correct content', () => {
      const config = getDefaultConfig();
      config.scan.framework = 'fastify';
      const writtenPath = writeConfig(tempDir, config);

      expect(existsSync(writtenPath)).toBe(true);
      const content = require('fs').readFileSync(writtenPath, 'utf-8');
      expect(content).toContain('fastify');
      expect(content).toContain('# Devora Configuration');
    });
  });
});
