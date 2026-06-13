import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { extractPythonRoutes } from '../src/scanner/extractors/python-extractor.js';

const FIXTURES = resolve(process.cwd(), 'test/fixtures');

describe('python-extractor', () => {
  describe('FastAPI', () => {
    it('extracts FastAPI routes from decorators', () => {
      const routes = extractPythonRoutes([resolve(FIXTURES, 'fastapi-basic/main.py')]);

      // @app.get('/health'), @app.get('/users'), @router.post('/users'),
      // @router.get('/users/{user_id}'), @router.put('/users/{user_id}'), @router.delete('/users/{user_id}')
      expect(routes.length).toBe(6);

      const health = routes.find((r) => r.path === '/health');
      expect(health).toBeDefined();
      expect(health!.method).toBe('GET');
      expect(health!.handler).toBe('health');

      const getUsers = routes.find((r) => r.path === '/users' && r.method === 'GET');
      expect(getUsers).toBeDefined();
      expect(getUsers!.handler).toBe('get_users');

      const postUsers = routes.find((r) => r.path === '/users' && r.method === 'POST');
      expect(postUsers).toBeDefined();
      expect(postUsers!.handler).toBe('create_user');

      const getUserById = routes.find((r) => r.path === '/users/:user_id' && r.method === 'GET');
      expect(getUserById).toBeDefined();
      expect(getUserById!.params).toHaveLength(1);
      expect(getUserById!.params[0].name).toBe('user_id');

      const updateUser = routes.find((r) => r.path === '/users/:user_id' && r.method === 'PUT');
      expect(updateUser).toBeDefined();
      expect(updateUser!.handler).toBe('update_user');

      const deleteUser = routes.find((r) => r.path === '/users/:user_id' && r.method === 'DELETE');
      expect(deleteUser).toBeDefined();
      expect(deleteUser!.handler).toBe('delete_user');
    });

    it('extracts async functions', () => {
      const routes = extractPythonRoutes([resolve(FIXTURES, 'fastapi-basic/main.py')]);
      const health = routes.find((r) => r.path === '/health');
      expect(health).toBeDefined();
      expect(health!.method).toBe('GET');
    });
  });

  describe('Flask', () => {
    it('extracts Flask routes from @app.route decorators', () => {
      const routes = extractPythonRoutes([resolve(FIXTURES, 'flask-basic/app.py')]);

      expect(routes.length).toBe(4);

      const health = routes.find((r) => r.path === '/health');
      expect(health).toBeDefined();
      expect(health!.method).toBe('GET');
      expect(health!.handler).toBe('health');

      const getUsers = routes.find((r) => r.path === '/users' && r.method === 'GET');
      expect(getUsers).toBeDefined();
      expect(getUsers!.handler).toBe('get_users');

      const postUsers = routes.find((r) => r.path === '/users' && r.method === 'POST');
      expect(postUsers).toBeDefined();
      expect(postUsers!.handler).toBe('create_user');

      const getUserById = routes.find((r) => r.path === '/users/:user_id' && r.method === 'GET');
      expect(getUserById).toBeDefined();
      expect(getUserById!.params).toHaveLength(1);
      expect(getUserById!.params[0].name).toBe('user_id');
    });

    it('defaults to GET when no methods specified', () => {
      const routes = extractPythonRoutes([resolve(FIXTURES, 'flask-basic/app.py')]);
      const health = routes.find((r) => r.path === '/health');
      expect(health).toBeDefined();
      expect(health!.method).toBe('GET');
    });
  });

  describe('getExtractor routing', () => {
    it('routes fastapi to python extractor', async () => {
      const { getExtractor } = await import('../src/scanner/extractors/index.js');
      const extractor = getExtractor('fastapi');
      const routes = extractor([resolve(FIXTURES, 'fastapi-basic/main.py')]);
      expect(routes.length).toBe(6);
    });

    it('routes flask to python extractor', async () => {
      const { getExtractor } = await import('../src/scanner/extractors/index.js');
      const extractor = getExtractor('flask');
      const routes = extractor([resolve(FIXTURES, 'flask-basic/app.py')]);
      expect(routes.length).toBe(4);
    });
  });
});
