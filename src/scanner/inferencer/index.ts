import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import * as t from '@babel/types';

const traverse = (babelTraverse as unknown as { default: typeof babelTraverse }).default || babelTraverse;
import type { Route, Param, Schema, Response } from '../../types/index.js';

function inferSchemaFromObject(obj: t.ObjectExpression): Schema {
  const properties: Record<string, Schema> = {};
  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) continue;
    if (!t.isIdentifier(prop.key) && !t.isStringLiteral(prop.key)) continue;
    const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
    properties[key] = inferSchemaFromNode(prop.value);
  }
  return { type: 'object', properties };
}

function inferSchemaFromNode(node: t.Node): Schema {
  if (t.isStringLiteral(node)) return { type: 'string' };
  if (t.isNumericLiteral(node)) return { type: 'number' };
  if (t.isBooleanLiteral(node)) return { type: 'boolean' };
  if (t.isNullLiteral(node)) return { type: 'null' };
  if (t.isObjectExpression(node)) return inferSchemaFromObject(node);
  if (t.isArrayExpression(node)) {
    if (node.elements.length > 0 && node.elements[0]) {
      return { type: 'array', items: inferSchemaFromNode(node.elements[0]) };
    }
    return { type: 'array', items: { type: 'string' } };
  }
  if (t.isIdentifier(node)) {
    if (node.name === 'true' || node.name === 'false') return { type: 'boolean' };
    if (node.name === 'undefined' || node.name === 'null') return { type: 'null' };
    return { type: 'string' };
  }
  return { type: 'string' };
}

interface RouteAnalysis {
  responses: Response[];
  bodyFields: Param[];
}

function analyzeHandlerBody(fn: t.Function | t.ArrowFunctionExpression): RouteAnalysis {
  const responses: Response[] = [];
  const bodyFields: Param[] = [];
  const seenBodyFields = new Set<string>();

  const walk = (node: t.Node) => {
    if (t.isCallExpression(node)) {
      const { callee, arguments: args } = node;

      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        if (callee.property.name === 'json' && args.length > 0) {
          let statusCode = 200;

          if (t.isCallExpression(callee.object) &&
              t.isMemberExpression(callee.object.callee) &&
              t.isIdentifier(callee.object.callee.property) &&
              callee.object.callee.property.name === 'status') {
            const statusArg = callee.object.arguments[0];
            if (t.isNumericLiteral(statusArg)) statusCode = statusArg.value;
          }

          const schema = args[0] ? inferSchemaFromNode(args[0]) : undefined;
          responses.push({ statusCode, contentType: 'application/json', schema });
          return;
        }

        if (callee.property.name === 'send') {
          let statusCode = 200;
          if (t.isCallExpression(callee.object) &&
              t.isMemberExpression(callee.object.callee) &&
              t.isIdentifier(callee.object.callee.property) &&
              callee.object.callee.property.name === 'status') {
            const statusArg = callee.object.arguments[0];
            if (t.isNumericLiteral(statusArg)) statusCode = statusArg.value;
          }

          if (args.length > 0 && (t.isObjectExpression(args[0]) || t.isArrayExpression(args[0]))) {
            responses.push({ statusCode, contentType: 'application/json', schema: inferSchemaFromNode(args[0]) });
          } else {
            responses.push({ statusCode, contentType: 'application/json' });
          }
          return;
        }
      }
    }

    if (t.isMemberExpression(node) &&
        t.isMemberExpression(node.object) &&
        t.isIdentifier(node.object.property) &&
        node.object.property.name === 'body' &&
        t.isIdentifier(node.property)) {
      const name = node.property.name;
      if (!seenBodyFields.has(name)) {
        seenBodyFields.add(name);
        bodyFields.push({ name, type: 'string', required: false });
      }
    }

    if (t.isVariableDeclarator(node) &&
        t.isObjectPattern(node.id) &&
        t.isMemberExpression(node.init) &&
        t.isIdentifier(node.init.property) &&
        node.init.property.name === 'body') {
      for (const prop of node.id.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const name = prop.key.name;
          if (!seenBodyFields.has(name)) {
            seenBodyFields.add(name);
            bodyFields.push({ name, type: 'string', required: false });
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

  walk(fn);

  const bodySchema: Schema | undefined = bodyFields.length > 0
    ? {
        type: 'object' as const,
        properties: Object.fromEntries(bodyFields.map((f) => [f.name, { type: (f.type === 'any' ? 'string' : f.type) as Schema['type'] }])),
      }
    : undefined;

  return { responses, bodyFields: bodyFields };
}

export function inferRouteSchemas(routes: Route[]): Route[] {
  const fileCache = new Map<string, string>();

  return routes.map((route) => {
    if (route.handler !== '[inline]') {
      if (route.responses.length === 0) {
        route.responses.push({ statusCode: 200, contentType: 'application/json', description: 'Success' });
      }
      return route;
    }

    let code = fileCache.get(route.filePath);
    if (!code) {
      try {
        code = readFileSync(route.filePath, 'utf-8');
        fileCache.set(route.filePath, code);
      } catch {
        if (route.responses.length === 0) {
          route.responses.push({ statusCode: 200, contentType: 'application/json', description: 'Success' });
        }
        return route;
      }
    }

    let ast: t.File;
    try {
      ast = parse(code, {
        sourceType: 'unambiguous',
        plugins: ['typescript', 'dynamicImport'],
        errorRecovery: true,
      });
    } catch {
      if (route.responses.length === 0) {
        route.responses.push({ statusCode: 200, contentType: 'application/json', description: 'Success' });
      }
      return route;
    }

    // Find the handler function at this route's line number
    let handlerFn: t.Function | t.ArrowFunctionExpression | null = null;

    traverse(ast, {
      enter(path) {
        if (handlerFn) return;
        const node = path.node;
        if (!node.loc) return;
        if (route.lineNumber > 0 && node.loc.start.line === route.lineNumber) {
          if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
            handlerFn = node;
            path.stop();
          }
        }
      },
    });

    if (!handlerFn) {
      if (route.responses.length === 0) {
        route.responses.push({ statusCode: 200, contentType: 'application/json', description: 'Success' });
      }
      return route;
    }

    const analysis = analyzeHandlerBody(handlerFn);

    if (analysis.responses.length > 0) {
      route.responses = analysis.responses;
    }

    const hasSuccess = route.responses.some((r) => r.statusCode >= 200 && r.statusCode < 300);
    if (!hasSuccess) {
      route.responses.push({ statusCode: 200, contentType: 'application/json', description: 'Success' });
    }

    if (analysis.bodyFields.length > 0 && !route.body) {
      route.body = {
        type: 'object',
        properties: Object.fromEntries(analysis.bodyFields.map((f) => [f.name, { type: (f.type === 'any' ? 'string' : f.type) as Schema['type'] }])),
      };
    }

    return route;
  });
}
