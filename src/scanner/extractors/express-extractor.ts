import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import * as t from '@babel/types';

const traverse = (babelTraverse as unknown as { default: typeof babelTraverse }).default || babelTraverse;
import fg from 'fast-glob';
import type { Route, HttpMethod, Param } from '../../types/index.js';

const HTTP_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
]);

const EXPRESS_APP_MARKERS = new Set([
  'app', 'router', 'api', 'server',
]);

interface ExpressInstance {
  name: string;
  type: 'app' | 'router';
}

function isExpressLike(name: string, instances: ExpressInstance[]): boolean {
  return EXPRESS_APP_MARKERS.has(name) || instances.some((i) => i.name === name);
}

function findExpressDeclarations(ast: t.File): ExpressInstance[] {
  const instances: ExpressInstance[] = [];

  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!t.isIdentifier(id) || !init) return;

      if (t.isCallExpression(init)) {
        const callee = init.callee;

        if (t.isIdentifier(callee) && callee.name === 'express') {
          instances.push({ name: id.name, type: 'app' });
          return;
        }

        if (t.isMemberExpression(callee) &&
            t.isIdentifier(callee.object) && callee.object.name === 'express' &&
            t.isIdentifier(callee.property) && callee.property.name === 'Router') {
          instances.push({ name: id.name, type: 'router' });
          return;
        }
      }

      if (t.isCallExpression(init) &&
          t.isCallExpression(init.callee) &&
          t.isIdentifier(init.callee.callee) &&
          init.callee.callee.name === 'require') {
        const arg = init.callee.arguments[0];
        if (t.isStringLiteral(arg) && arg.value === 'express') {
          instances.push({ name: id.name, type: 'app' });
        }
      }
    },
  });

  return instances;
}

function extractPathString(pathNode: t.Node): string | null {
  if (t.isStringLiteral(pathNode)) return pathNode.value;
  if (t.isTemplateLiteral(pathNode) && pathNode.quasis.length > 0) {
    return pathNode.quasis.map((q) => q.value.raw).join('');
  }
  return null;
}

function extractInlineParams(pathStr: string): Param[] {
  const params: Param[] = [];
  const pattern = /:(\w+)/g;
  let match;
  while ((match = pattern.exec(pathStr)) !== null) {
    params.push({ name: match[1], type: 'string', required: true });
  }
  return params;
}

function findRouteCalls(ast: t.File, instances: ExpressInstance[], file: string): Route[] {
  const routes: Route[] = [];

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      if (!t.isMemberExpression(node.callee)) return;
      const prop = node.callee.property;
      if (!t.isIdentifier(prop)) return;
      if (!HTTP_METHODS.has(prop.name)) return;

      const objectName = node.callee.object;
      if (!t.isIdentifier(objectName)) return;
      if (!isExpressLike(objectName.name, instances)) return;

      const args = node.arguments;
      if (args.length < 2) return;

      const pathStr = extractPathString(args[0]);
      if (!pathStr) return;

      const method = prop.name.toUpperCase() as HttpMethod;
      const middleware: string[] = [];
      let handler = '';

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (t.isFunction(arg) || t.isArrowFunctionExpression(arg)) {
          handler = '[inline]';
        } else if (t.isIdentifier(arg)) {
          if (i === args.length - 1) {
            handler = arg.name;
          } else {
            middleware.push(arg.name);
          }
        } else {
          if (i === args.length - 1) {
            handler = '[expression]';
          } else {
            middleware.push('[expression]');
          }
        }
      }

      const params = extractInlineParams(pathStr);
      const queryParams: Param[] = [];

      // Extract query params from the handler if inline
      if (handler === '[inline]') {
        const lastArg = args[args.length - 1];
        if (t.isFunction(lastArg) || t.isArrowFunctionExpression(lastArg)) {
          const seen = new Set<string>();

          // Walk the AST manually since traverse on a subtree fails
          const walk = (node: t.Node) => {
            if (t.isMemberExpression(node) &&
                t.isMemberExpression(node.object) &&
                t.isIdentifier(node.object.property) &&
                node.object.property.name === 'query' &&
                t.isIdentifier(node.property)) {
              const name = node.property.name;
              if (!seen.has(name)) {
                seen.add(name);
                queryParams.push({ name, type: 'string', required: false });
              }
            }
            if (t.isVariableDeclarator(node) &&
                t.isObjectPattern(node.id) &&
                t.isMemberExpression(node.init) &&
                t.isMemberExpression(node.init.object) &&
                t.isIdentifier(node.init.object.property) &&
                node.init.object.property.name === 'body') {
              for (const prop of node.id.properties) {
                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                  const name = prop.key.name;
                  if (!seen.has(name)) {
                    seen.add(name);
                    queryParams.push({ name, type: 'string', required: false });
                  }
                }
              }
            }
            for (const key of Object.keys(node)) {
              if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' ||
                  key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
              const val = (node as any)[key];
              if (Array.isArray(val)) {
                for (const item of val) {
                  if (item && typeof item.type === 'string') walk(item);
                }
              } else if (val && typeof val.type === 'string') {
                walk(val);
              }
            }
          };
          walk(lastArg);
        }
      }

      routes.push({
        method,
        path: pathStr,
        handler,
        params,
        queryParams,
        responses: [],
        middleware,
        tags: [],
        filePath: file,
        lineNumber: node.loc?.start.line ?? 0,
      });
    },
  });

  return routes;
}

export function extractExpressRoutes(filesOrGlobs: string[]): Route[] {
  let files: string[] = [];

  for (const entry of filesOrGlobs) {
    const normalized = entry.replace(/\\/g, '/');
    try {
      const matched = fg.globSync(normalized, { absolute: true });
      files.push(...matched);
    } catch {
      if (entry.endsWith('.js') || entry.endsWith('.ts')) {
        files.push(normalized);
      }
    }
  }

  files = [...new Set(files)];
  const allRoutes: Route[] = [];

  for (const file of files) {
    let code: string;
    try {
      code = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    let ast: t.File;
    try {
      ast = parse(code, {
        sourceType: 'unambiguous',
        plugins: ['typescript', 'dynamicImport'],
        errorRecovery: true,
      });
    } catch {
      continue;
    }

    const instances = findExpressDeclarations(ast);
    if (instances.length === 0) continue;

    const routes = findRouteCalls(ast, instances, file);
    allRoutes.push(...routes);
  }

  return allRoutes;
}
