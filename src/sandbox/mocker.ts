import type { OpenApiSpec, OpenApiSchema } from '../types/index.js';

export interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  timingMs: number;
}

function generateValue(schema: OpenApiSchema, depth: number): unknown {
  if (depth > 4) return null;

  switch (schema.type) {
    case 'string':
      if (schema.enum && schema.enum.length > 0) return schema.enum[0];
      if (schema.description?.toLowerCase().includes('email')) return 'user@example.com';
      if (schema.description?.toLowerCase().includes('url')) return 'https://example.com';
      if (schema.description?.toLowerCase().includes('date')) return new Date().toISOString();
      return 'example';

    case 'number':
      return 42;

    case 'boolean':
      return true;

    case 'object':
      if (!schema.properties) return {};
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = generateValue(prop, depth + 1);
      }
      return obj;

    case 'array':
      if (schema.items) {
        return [generateValue(schema.items, depth + 1)];
      }
      return [];

    case 'null':
      return null;

    default:
      return 'example';
  }
}

function pickMockStatus(spec: OpenApiSpec, method: string, path: string): number {
  for (const [specPath, methods] of Object.entries(spec.paths)) {
    if (specPath === path && methods[method]?.responses) {
      const codes = Object.keys(methods[method].responses).map(Number);
      if (codes.length > 0) {
        const successCodes = codes.filter((c) => c >= 200 && c < 300);
        return successCodes.length > 0 ? successCodes[0] : codes[0];
      }
    }
  }
  return method === 'post' ? 201 : 200;
}

function pickMockSchema(spec: OpenApiSpec, method: string, path: string, statusCode: number): OpenApiSchema | null {
  for (const [specPath, methods] of Object.entries(spec.paths)) {
    if (specPath === path && methods[method]?.responses) {
      const resp = methods[method].responses[String(statusCode)];
      if (resp?.content?.['application/json']?.schema) {
        return resp.content['application/json'].schema;
      }
      if (resp?.content?.['*/*']?.schema) {
        return resp.content['*/*'].schema;
      }
    }
  }
  return null;
}

export function generateMockResponse(spec: OpenApiSpec, method: string, path: string): MockResponse {
  const statusCode = pickMockStatus(spec, method, path);
  const schema = pickMockSchema(spec, method, path, statusCode);
  const delay = 15 + Math.random() * 35;
  const startTime = Date.now();

  let body = '{}';
  try {
    const value = schema ? generateValue(schema, 0) : { message: 'Mock response' };
    body = JSON.stringify(value, null, 2);
  } catch {
    body = JSON.stringify({ message: 'Mock response' });
  }

  const timingMs = Date.now() - startTime + Math.round(delay);

  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'x-mock-response': 'true',
      'x-response-time': `${timingMs}ms`,
    },
    body,
    timingMs,
  };
}
