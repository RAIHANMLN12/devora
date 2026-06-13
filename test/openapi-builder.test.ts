import { describe, it, expect } from 'vitest';
import { buildOpenApiSpec } from '../src/scanner/builder/index.js';
import type { Route } from '../../src/types/index.js';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    method: 'GET',
    path: '/test',
    handler: '[inline]',
    params: [],
    queryParams: [],
    responses: [{ statusCode: 200, contentType: 'application/json', description: 'Success' }],
    middleware: [],
    tags: [],
    filePath: 'test.js',
    lineNumber: 1,
    ...overrides,
  };
}

describe('openapi-builder', () => {
  it('builds a valid OpenAPI spec from a single route', () => {
    const routes = [makeRoute({ method: 'GET', path: '/health' })];
    const spec = buildOpenApiSpec(routes);

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('API Documentation');
    expect(spec.paths['/health']).toBeDefined();
    expect(spec.paths['/health'].get).toBeDefined();
  });

  it('converts Express path params to OpenAPI format', () => {
    const routes = [makeRoute({
      method: 'GET',
      path: '/users/:id',
      params: [{ name: 'id', type: 'string', required: true }],
    })];
    const spec = buildOpenApiSpec(routes);

    expect(spec.paths['/users/{id}']).toBeDefined();
    expect(spec.paths['/users/{id}'].get).toBeDefined();
    expect(spec.paths['/users/{id}'].get!.parameters).toHaveLength(1);
    expect(spec.paths['/users/{id}'].get!.parameters![0].name).toBe('id');
    expect(spec.paths['/users/{id}'].get!.parameters![0].in).toBe('path');
  });

  it('groups routes by path and method', () => {
    const routes = [
      makeRoute({ method: 'GET', path: '/users' }),
      makeRoute({ method: 'POST', path: '/users' }),
    ];
    const spec = buildOpenApiSpec(routes);

    expect(spec.paths['/users'].get).toBeDefined();
    expect(spec.paths['/users'].post).toBeDefined();
  });

  it('includes request body for POST/PUT/PATCH', () => {
    const routes = [
      makeRoute({
        method: 'POST',
        path: '/users',
        body: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      }),
    ];
    const spec = buildOpenApiSpec(routes);

    expect(spec.paths['/users'].post!.requestBody).toBeDefined();
    expect(spec.paths['/users'].post!.requestBody!.content['application/json']).toBeDefined();
  });

  it('handles multiple response status codes', () => {
    const routes = [makeRoute({
      method: 'POST',
      path: '/users',
      responses: [
        { statusCode: 201, contentType: 'application/json', description: 'Created' },
        { statusCode: 400, contentType: 'application/json', description: 'Bad Request' },
      ],
    })];
    const spec = buildOpenApiSpec(routes);

    expect(spec.paths['/users'].post!.responses['201']).toBeDefined();
    expect(spec.paths['/users'].post!.responses['400']).toBeDefined();
  });

  it('includes query parameters', () => {
    const routes = [makeRoute({
      method: 'GET',
      path: '/items',
      queryParams: [
        { name: 'page', type: 'number', required: false },
        { name: 'sort', type: 'string', required: false },
      ],
    })];
    const spec = buildOpenApiSpec(routes);

    expect(spec.paths['/items'].get!.parameters).toHaveLength(2);
    expect(spec.paths['/items'].get!.parameters![0].in).toBe('query');
  });

  it('uses custom title from options', () => {
    const routes = [makeRoute()];
    const spec = buildOpenApiSpec(routes, { title: 'My API', version: '2.0.0' });

    expect(spec.info.title).toBe('My API');
    expect(spec.info.version).toBe('2.0.0');
  });
});
