import { describe, it, expect } from 'vitest';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { detectProject, detectLanguage, detectFramework } from '../src/detector/index.js';

function createTempDir(): string {
  const dir = resolve(tmpdir(), `devora-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('detector', () => {
  describe('detectProject', () => {
    it('returns null for empty directory', () => {
      const dir = createTempDir();
      const result = detectProject(dir);
      expect(result).toBeNull();
    });

    it('detects Express from package.json', () => {
      const dir = createTempDir();
      writeFileSync(resolve(dir, 'package.json'), JSON.stringify({
        dependencies: { express: '^4.18.0' },
      }));
      const result = detectProject(dir);
      expect(result).not.toBeNull();
      expect(result!.framework).toBe('express');
      expect(result!.language).toBe('javascript');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects Fastify from package.json', () => {
      const dir = createTempDir();
      writeFileSync(resolve(dir, 'package.json'), JSON.stringify({
        dependencies: { fastify: '^4.0.0' },
      }));
      const result = detectProject(dir);
      expect(result).not.toBeNull();
      expect(result!.framework).toBe('fastify');
    });

    it('detects FastAPI from pyproject.toml', () => {
      const dir = createTempDir();
      writeFileSync(resolve(dir, 'pyproject.toml'), `[tool.poetry.dependencies]\nfastapi = "^0.104.0"\n`);
      const result = detectProject(dir);
      expect(result).not.toBeNull();
      expect(result!.framework).toBe('fastapi');
      expect(result!.language).toBe('python');
    });

    it('detects Flask from requirements.txt', () => {
      const dir = createTempDir();
      writeFileSync(resolve(dir, 'requirements.txt'), 'flask==3.0.0\n');
      const result = detectProject(dir);
      expect(result).not.toBeNull();
      expect(result!.framework).toBe('flask');
    });

    it('prefers package.json over pyproject.toml', () => {
      const dir = createTempDir();
      writeFileSync(resolve(dir, 'package.json'), JSON.stringify({
        dependencies: { express: '^4.18.0' },
      }));
      writeFileSync(resolve(dir, 'pyproject.toml'), `[tool.poetry.dependencies]\nfastapi = "^0.104.0"\n`);
      const result = detectProject(dir);
      expect(result!.framework).toBe('express');
    });
  });

  describe('detectLanguage', () => {
    it('returns "unknown" for empty directory', () => {
      const dir = createTempDir();
      expect(detectLanguage(dir)).toBe('unknown');
    });
  });

  describe('detectFramework', () => {
    it('returns "unknown" for empty directory', () => {
      const dir = createTempDir();
      expect(detectFramework(dir)).toBe('unknown');
    });
  });
});
