import { readFileSync } from 'fs';
import fg from 'fast-glob';
import type { Route, HttpMethod, SupportedFramework, Param } from '../../types/index.js';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const LOWER_METHODS = new Set(HTTP_METHODS.map((m) => m.toLowerCase()));

interface DecoratorMatch {
  method: HttpMethod;
  path: string;
  lineNumber: number;
}

interface FunctionDef {
  name: string;
  lineNumber: number;
  decorators: DecoratorMatch[];
}

function extractDecorators(lines: string[], funcLineIndex: number): DecoratorMatch[] {
  const decorators: DecoratorMatch[] = [];
  let i = funcLineIndex - 1;

  while (i >= 0) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) {
      i--;
      continue;
    }
    if (!line.startsWith('@')) break;

    const match = line.match(/^@(\w+)\.(\w+)\(([^)]*)\)/);
    if (!match) {
      i--;
      continue;
    }

    const [, obj, methodOrRoute, argsStr] = match;

    if (methodOrRoute === 'route') {
      const pathMatch = argsStr.match(/(['"])([^'"]+)\1/);
      if (!pathMatch) { i--; continue; }
      const path = pathMatch[2];

      const methodsMatch = argsStr.match(/methods\s*=\s*\[([^\]]*)\]/);
      let methods: string[];
      if (methodsMatch) {
        methods = [...methodsMatch[1].matchAll(/['"](\w+)['"]/g)].map((m) => m[1].toUpperCase());
      } else {
        methods = ['GET'];
      }

      for (const m of methods) {
        if (LOWER_METHODS.has(m.toLowerCase())) {
          decorators.push({
            method: m.toUpperCase() as HttpMethod,
            path,
            lineNumber: i + 1,
          });
        }
      }
    } else if (LOWER_METHODS.has(methodOrRoute)) {
      const pathMatch = argsStr.match(/(['"])([^'"]+)\1/);
      if (!pathMatch) { i--; continue; }
      decorators.push({
        method: methodOrRoute.toUpperCase() as HttpMethod,
        path: pathMatch[2],
        lineNumber: i + 1,
      });
    }

    i--;
  }

  return decorators;
}

function convertPathParams(path: string): { openapiPath: string; params: Param[] } {
  const params: Param[] = [];
  const openapiPath = path.replace(/\{(\w+)\}/g, (_, name) => {
    params.push({ name, type: 'string', required: true });
    return `:${name}`;
  }).replace(/<(\w+):(\w+)>/g, (_, _type, name) => {
    params.push({ name, type: 'string', required: true });
    return `:${name}`;
  }).replace(/<(\w+)>/g, (_, name) => {
    params.push({ name, type: 'string', required: true });
    return `:${name}`;
  });
  return { openapiPath, params };
}

function extractFunctions(content: string): FunctionDef[] {
  const functions: FunctionDef[] = [];
  const lines = content.split('\n');
  const funcRegex = /^(?:async\s+)?def\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(funcRegex);
    if (!match) continue;

    const name = match[1];
    const lineNumber = i + 1;
    const decorators = extractDecorators(lines, i);

    functions.push({ name, lineNumber, decorators });
  }

  return functions;
}

export function extractPythonRoutes(files: string[]): Route[] {
  const routes: Route[] = [];

  for (const pattern of files) {
    let resolvedFiles: string[];
    try {
      resolvedFiles = fg.sync(pattern.replace(/\\/g, '/'), { absolute: true });
    } catch {
      resolvedFiles = [];
    }

    for (const filePath of resolvedFiles) {
      if (!filePath.endsWith('.py')) continue;

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const functions = extractFunctions(content);

      for (const fn of functions) {
        for (const dec of fn.decorators) {
          const { openapiPath, params } = convertPathParams(dec.path);

          routes.push({
            method: dec.method,
            path: openapiPath,
            handler: fn.name,
            params,
            queryParams: [],
            responses: [],
            middleware: [],
            tags: [],
            summary: undefined,
            description: undefined,
            filePath,
            lineNumber: fn.lineNumber,
          });
        }
      }
    }
  }

  return routes;
}
