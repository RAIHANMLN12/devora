import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar.js';
import { EndpointView } from './EndpointView.js';

interface OpenApiPath {}
interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, any>>;
}

export function App() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetch('/openapi.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load spec (${r.status})`);
        return r.json();
      })
      .then((data: OpenApiSpec) => setSpec(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleSelect = useCallback((path: string, method: string) => {
    setSelectedPath(path);
    setSelectedMethod(method);
  }, []);

  if (error) {
    return (
      <div className="app-error">
        <h1>Devora</h1>
        <p>Could not load API specification.</p>
        <p className="error-detail">{error}</p>
        <p>Make sure to run <code>devora scan</code> first.</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading documentation...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        spec={spec}
        search={search}
        onSearchChange={setSearch}
        selectedPath={selectedPath}
        selectedMethod={selectedMethod}
        onSelect={handleSelect}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="content">
        {selectedPath && selectedMethod ? (
          <EndpointView
            path={selectedPath}
            method={selectedMethod}
            operation={spec.paths[selectedPath]?.[selectedMethod]}
            spec={spec}
          />
        ) : (
          <div className="welcome">
            <h1>{spec.info.title}</h1>
            {spec.info.description && <p className="api-description">{spec.info.description}</p>}
            <p className="api-version">OpenAPI {spec.openapi} &middot; v{spec.info.version}</p>
            <p className="welcome-hint">Select an endpoint from the sidebar to view its documentation.</p>
            <div className="stats">
              <div className="stat">
                <span className="stat-value">{Object.keys(spec.paths).length}</span>
                <span className="stat-label">Paths</span>
              </div>
              <div className="stat">
                <span className="stat-value">{countOperations(spec.paths)}</span>
                <span className="stat-label">Endpoints</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function countOperations(paths: Record<string, Record<string, any>>): number {
  let count = 0;
  for (const path of Object.keys(paths)) {
    for (const method of Object.keys(paths[path])) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        count++;
      }
    }
  }
  return count;
}
