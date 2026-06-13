import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { DetectionResult, SupportedFramework } from '../types/index.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface PyProjectToml {
  // Simplified parse — just check file existence + keywords
}

const FRAMEWORK_PATTERNS: Record<SupportedFramework, {
  packageKeys: string[];
  fileIndicators: string[];
}> = {
  express: {
    packageKeys: ['express'],
    fileIndicators: ['app.use', 'router.get', 'router.post', 'app.get', 'app.post'],
  },
  fastify: {
    packageKeys: ['fastify'],
    fileIndicators: ['fastify.get', 'fastify.post', 'app.get', 'app.post'],
  },
  fastapi: {
    packageKeys: ['fastapi'],
    fileIndicators: ['@app.get', '@app.post', '@app.put', '@app.delete'],
  },
  flask: {
    packageKeys: ['flask'],
    fileIndicators: ['@app.route'],
  },
};

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function detectFromPackageJson(cwd: string): DetectionResult | null {
  const pkg = readJsonSafe(resolve(cwd, 'package.json')) as PackageJson | null;
  if (!pkg) return null;

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const depNames = Object.keys(allDeps);

  // Check for Express
  if (depNames.includes('express')) {
    return {
      language: 'javascript',
      framework: 'express',
      version: allDeps.express,
      confidence: 0.9,
    };
  }

  // Check for Fastify
  if (depNames.includes('fastify')) {
    return {
      language: 'javascript',
      framework: 'fastify',
      version: allDeps.fastify,
      confidence: 0.9,
    };
  }

  // Check for TypeScript (indicates TS project even if framework unknown)
  if (depNames.includes('typescript')) {
    return {
      language: 'typescript',
      framework: 'express', // best guess
      confidence: 0.3,
    };
  }

  // Check for common Express dev dependencies
  const expressRelated = ['@types/express', 'express-handlebars', 'express-session'];
  if (expressRelated.some((d) => depNames.includes(d))) {
    return {
      language: 'typescript',
      framework: 'express',
      confidence: 0.7,
    };
  }

  return null;
}

function detectFromPyProject(cwd: string): DetectionResult | null {
  const tomlPath = resolve(cwd, 'pyproject.toml');
  if (!existsSync(tomlPath)) return null;

  try {
    const content = readFileSync(tomlPath, 'utf-8').toLowerCase();

    if (content.includes('fastapi')) {
      return {
        language: 'python',
        framework: 'fastapi',
        confidence: 0.85,
      };
    }

    if (content.includes('flask')) {
      return {
        language: 'python',
        framework: 'flask',
        confidence: 0.85,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

function detectFromRequirements(cwd: string): DetectionResult | null {
  const reqPaths = ['requirements.txt', 'requirements-dev.txt'];

  for (const reqFile of reqPaths) {
    const reqPath = resolve(cwd, reqFile);
    if (!existsSync(reqPath)) continue;

    try {
      const content = readFileSync(reqPath, 'utf-8').toLowerCase();

      if (content.includes('fastapi')) {
        return {
          language: 'python',
          framework: 'fastapi',
          confidence: 0.8,
        };
      }

      if (content.includes('flask')) {
        return {
          language: 'python',
          framework: 'flask',
          confidence: 0.8,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function detectProject(cwd: string = process.cwd()): DetectionResult | null {
  return (
    detectFromPackageJson(cwd) ??
    detectFromPyProject(cwd) ??
    detectFromRequirements(cwd)
  );
}

export function detectLanguage(cwd: string = process.cwd()): string {
  const result = detectProject(cwd);
  return result?.language ?? 'unknown';
}

export function detectFramework(cwd: string = process.cwd()): string {
  const result = detectProject(cwd);
  return result?.framework ?? 'unknown';
}
