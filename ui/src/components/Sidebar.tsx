import React from 'react';

interface SidebarProps {
  spec: any;
  search: string;
  onSearchChange: (v: string) => void;
  selectedPath: string | null;
  selectedMethod: string | null;
  onSelect: (path: string, method: string) => void;
  theme: string;
  onToggleTheme: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  get: 'method-get',
  post: 'method-post',
  put: 'method-put',
  patch: 'method-patch',
  delete: 'method-delete',
  head: 'method-head',
  options: 'method-options',
};

export function Sidebar(props: SidebarProps) {
  const entries = buildEntries(props.spec.paths, props.search);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Devora</h2>
        <button className="theme-toggle" onClick={props.onToggleTheme} title="Toggle theme">
          {props.theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search endpoints..."
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
        />
      </div>

      <nav className="endpoint-list">
        {entries.map(([path, methods]) => (
          <div key={path} className="path-group">
            <div className="path-group-name">{path}</div>
            {methods.map((method) => {
              const isSelected = path === props.selectedPath && method.method === props.selectedMethod;
              return (
                <button
                  key={`${path}-${method.method}`}
                  className={`endpoint-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => props.onSelect(path, method.method)}
                >
                  <span className={`method-badge ${METHOD_COLORS[method.method] || ''}`}>
                    {method.method.toUpperCase()}
                  </span>
                  <span className="endpoint-summary">{method.summary || method.operationId || ''}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function buildEntries(paths: Record<string, any>, search: string): [string, { method: string; summary?: string; operationId?: string }[]][] {
  const result: [string, any[]][] = [];

  for (const [path, methods] of Object.entries(paths)) {
    const ops: any[] = [];
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
      ops.push({ method, summary: op.summary, operationId: op.operationId });
    }
    if (ops.length === 0) continue;

    if (search) {
      const q = search.toLowerCase();
      const matches = ops.filter(
        (op) =>
          path.toLowerCase().includes(q) ||
          (op.summary && op.summary.toLowerCase().includes(q)) ||
          (op.operationId && op.operationId.toLowerCase().includes(q))
      );
      if (matches.length > 0) {
        result.push([path, matches]);
      }
    } else {
      result.push([path, ops]);
    }
  }

  return result;
}
