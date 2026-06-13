import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { extractExpressRoutes } from '../src/scanner/extractors/express-extractor.js';

const FIXTURES = resolve(process.cwd(), 'test/fixtures');

describe('express-extractor', () => {
  it('extracts basic GET/POST routes', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-basic/app.js')]);

    expect(routes.length).toBe(6);

    const healthRoute = routes.find((r) => r.path === '/health');
    expect(healthRoute).toBeDefined();
    expect(healthRoute!.method).toBe('GET');
    expect(healthRoute!.params).toHaveLength(0);

    const getUsers = routes.find((r) => r.path === '/users' && r.method === 'GET');
    expect(getUsers).toBeDefined();

    const postUsers = routes.find((r) => r.path === '/users' && r.method === 'POST');
    expect(postUsers).toBeDefined();

    const getUserById = routes.find((r) => r.path === '/users/:id');
    expect(getUserById).toBeDefined();
    expect(getUserById!.method).toBe('GET');
    expect(getUserById!.params).toHaveLength(1);
    expect(getUserById!.params[0].name).toBe('id');
  });

  it('extracts routes with middleware', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-params/app.js')]);

    expect(routes.length).toBe(7);

    const itemsGet = routes.find((r) => r.path === '/api/items' && r.method === 'GET');
    expect(itemsGet).toBeDefined();
    expect(itemsGet!.middleware).toContain('validateAuth');

    const itemsPost = routes.find((r) => r.path === '/api/items' && r.method === 'POST');
    expect(itemsPost).toBeDefined();
    expect(itemsPost!.middleware).toContain('validateAuth');
    expect(itemsPost!.middleware).toContain('validateBody');

    const itemsIdGet = routes.find((r) => r.path === '/api/items/:id' && r.method === 'GET');
    expect(itemsIdGet).toBeDefined();
    expect(itemsIdGet!.params).toHaveLength(1);
    expect(itemsIdGet!.params[0].name).toBe('id');
  });

  it('detects Express from package.json and scans fixture', () => {
    const routes = extractExpressRoutes([resolve(FIXTURES, 'express-basic/*.js')]);
    expect(routes.length).toBeGreaterThanOrEqual(6);
  });
});
