import { writeFileSync } from 'fs';
import type { Route, OpenApiSpec, OpenApiSchema, Schema, Param } from '../../types/index.js';

function mapToOpenApiType(type: string): string {
  switch (type) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'object': return 'object';
    case 'array': return 'array';
    default: return 'string';
  }
}

function convertSchema(schema?: Schema): OpenApiSchema {
  if (!schema) return { type: 'string' };

  const result: OpenApiSchema = { type: mapToOpenApiType(schema.type) };

  if (schema.type === 'object' && schema.properties) {
    result.properties = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      result.properties[key] = convertSchema(prop);
    }
    if (schema.required && schema.required.length > 0) {
      result.required = schema.required;
    }
  }

  if (schema.type === 'array') {
    result.items = convertSchema(schema.items);
  }

  if (schema.description) result.description = schema.description;

  return result;
}

function convertParam(param: Param): {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
} {
  return {
    name: param.name,
    in: 'path' as const,
    required: param.required,
    schema: { type: mapToOpenApiType(param.type) },
    description: param.description,
  };
}

function convertQueryParam(param: Param): {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
} {
  return {
    name: param.name,
    in: 'query' as const,
    required: param.required,
    schema: { type: mapToOpenApiType(param.type) },
    description: param.description,
  };
}

function convertPathToOpenApi(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}');
}

export function buildOpenApiSpec(routes: Route[], options: { title?: string; version?: string } = {}): OpenApiSpec {
  const paths: OpenApiSpec['paths'] = {};

  for (const route of routes) {
    const openApiPath = convertPathToOpenApi(route.path);

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    const method = route.method.toLowerCase();

    const parameters: OpenApiSpec['paths'][string][string]['parameters'] = [];
    for (const param of route.params) {
      parameters.push(convertParam(param));
    }
    for (const qp of route.queryParams) {
      parameters.push(convertQueryParam(qp));
    }

    const responses: Record<string, { description: string; content?: Record<string, { schema: OpenApiSchema }> }> = {};
    for (const resp of route.responses) {
      const key = String(resp.statusCode);
      responses[key] = {
        description: resp.description || (resp.statusCode >= 200 && resp.statusCode < 300 ? 'Success' : 'Error'),
      };
      if (resp.schema) {
        responses[key].content = {
          'application/json': { schema: convertSchema(resp.schema) },
        };
      }
    }

    if (Object.keys(responses).length === 0) {
      responses['200'] = { description: 'Success' };
    }

    const operation: OpenApiSpec['paths'][string][string] = {
      summary: route.summary || `${route.method} ${route.path}`,
      description: route.description,
      operationId: `${route.method}${openApiPath.replace(/[\/{}]/g, '_').replace(/_{2,}/g, '_')}`,
      tags: route.tags.length > 0 ? route.tags : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses,
    };

    if ((route.method === 'POST' || route.method === 'PUT' || route.method === 'PATCH') && route.body) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': { schema: convertSchema(route.body) },
        },
      };
    }

    paths[openApiPath][method] = operation;
  }

  const spec: OpenApiSpec = {
    openapi: '3.0.3',
    info: {
      title: options.title || 'API Documentation',
      version: options.version || '1.0.0',
      description: 'Auto-generated API documentation by Devora',
    },
    paths,
  };

  return spec;
}

export function writeOpenApiSpec(spec: OpenApiSpec, outputPath: string): void {
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
}
