import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { extractExpressRoutes } from '../src/scanner/extractors/express-extractor.js';
import { inferRouteSchemas } from '../src/scanner/inferencer/index.js';

const FIXTURES = resolve(process.cwd(), 'test/fixtures');

describe('inferencer', () => {
  it('infers response schemas from res.json() calls', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-basic/app.js')]);
    const inferred = inferRouteSchemas(routes);

    const healthRoute = inferred.find((r) => r.path === '/health');
    expect(healthRoute).toBeDefined();
    expect(healthRoute!.responses.length).toBeGreaterThanOrEqual(1);
    const healthResp = healthRoute!.responses.find((r) => r.statusCode === 200);
    expect(healthResp).toBeDefined();
    expect(healthResp!.schema).toBeDefined();
    expect(healthResp!.schema!.type).toBe('object');
    expect(healthResp!.schema!.properties).toHaveProperty('status');
  });

  it('infers status codes from res.status(N).json()', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-basic/app.js')]);
    const inferred = inferRouteSchemas(routes);

    const postRoute = inferred.find((r) => r.path === '/users' && r.method === 'POST');
    expect(postRoute).toBeDefined();
    const createdResp = postRoute!.responses.find((r) => r.statusCode === 201);
    expect(createdResp).toBeDefined();
    expect(createdResp!.schema).toBeDefined();
    expect(createdResp!.schema!.properties).toHaveProperty('id');
    expect(createdResp!.schema!.properties).toHaveProperty('name');
    expect(createdResp!.schema!.properties).toHaveProperty('email');

    const deleteRoute = inferred.find((r) => r.method === 'DELETE');
    expect(deleteRoute).toBeDefined();
    const noContentResp = deleteRoute!.responses.find((r) => r.statusCode === 204);
    expect(noContentResp).toBeDefined();
  });

  it('infers body schema from req.body usage', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-basic/app.js')]);
    const inferred = inferRouteSchemas(routes);

    const postRoute = inferred.find((r) => r.path === '/users' && r.method === 'POST');
    expect(postRoute).toBeDefined();
    expect(postRoute!.body).toBeDefined();
    expect(postRoute!.body!.type).toBe('object');
    expect(postRoute!.body!.properties).toHaveProperty('name');
    expect(postRoute!.body!.properties).toHaveProperty('email');
  });

  it('infers query params from req.query usage', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-params/app.js')]);
    const inferred = inferRouteSchemas(routes);

    const itemsGet = inferred.find((r) => r.path === '/api/items' && r.method === 'GET');
    expect(itemsGet).toBeDefined();
    const categoryQuery = itemsGet!.queryParams.find((q) => q.name === 'category');
    expect(categoryQuery).toBeDefined();
    const sortQuery = itemsGet!.queryParams.find((q) => q.name === 'sort');
    expect(sortQuery).toBeDefined();
  });
});
