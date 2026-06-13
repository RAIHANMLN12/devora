import React, { useState, useCallback } from 'react';

interface SandboxPanelProps {
  path: string;
  method: string;
  operation: any;
}

interface ParamInput {
  name: string;
  value: string;
}

interface SandboxResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  timingMs: number;
  error?: string;
  mode?: string;
  target?: string;
}

export function SandboxPanel({ path, method, operation }: SandboxPanelProps) {
  const [params, setParams] = useState<ParamInput[]>(() => {
    const p = operation?.parameters || [];
    return p.map((param: any) => ({
      name: param.name,
      value: param.schema?.type === 'number' || param.schema?.type === 'integer' ? '1' : '',
    }));
  });
  const [headers, setHeaders] = useState<ParamInput[]>([{ name: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState(() => {
    if (operation?.requestBody?.content?.['application/json']?.schema) {
      return JSON.stringify(generateExample(operation.requestBody.content['application/json'].schema), null, 2);
    }
    return '';
  });
  const [mode, setMode] = useState<'mock' | 'proxy'>('mock');
  const [target, setTarget] = useState('http://localhost:3000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateParam = useCallback((name: string, value: string) => {
    setParams((prev) => prev.map((p) => (p.name === name ? { ...p, value } : p)));
  }, []);

  const updateHeader = useCallback((index: number, field: 'name' | 'value', value: string) => {
    setHeaders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { name: '', value: '' }]);
  }, []);

  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const query: Record<string, string> = {};
    const pathParams: Record<string, string> = {};
    let resolvedPath = path;

    for (const p of params) {
      if (p.name && p.value) {
        if (resolvedPath.includes(`{${p.name}}`) || resolvedPath.includes(`:${p.name}`)) {
          pathParams[p.name] = p.value;
          resolvedPath = resolvedPath.replace(`{${p.name}}`, p.value).replace(`:${p.name}`, p.value);
        } else {
          query[p.name] = p.value;
        }
      }
    }

    const headerObj: Record<string, string> = {};
    for (const h of headers) {
      if (h.name && h.value) headerObj[h.name] = h.value;
    }

    try {
      const response = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path: resolvedPath,
          query,
          headers: headerObj,
          body: body || undefined,
          mode,
          target: mode === 'proxy' ? target : undefined,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error + (data.hint ? `\n${data.hint}` : ''));
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [path, method, params, headers, body, mode, target]);

  return (
    <div className="sandbox-panel">
      <div className="sandbox-header">
        <h3 className="sandbox-title">Test Endpoint</h3>
        <div className="sandbox-mode-toggle">
          <label className={`mode-btn ${mode === 'mock' ? 'active' : ''}`}>
            <input type="radio" name="mode" value="mock" checked={mode === 'mock'} onChange={() => setMode('mock')} />
            Mock
          </label>
          <label className={`mode-btn ${mode === 'proxy' ? 'active' : ''}`}>
            <input type="radio" name="mode" value="proxy" checked={mode === 'proxy'} onChange={() => setMode('proxy')} />
            Proxy
          </label>
        </div>
      </div>

      {mode === 'proxy' && (
        <div className="sandbox-field">
          <label className="field-label">Proxy Target</label>
          <input
            type="text"
            className="field-input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="http://localhost:3000"
          />
        </div>
      )}

      {params.length > 0 && (
        <div className="sandbox-section">
          <label className="field-label">Parameters</label>
          <div className="sandbox-params">
            {params.map((p) => (
              <div key={p.name} className="sandbox-param-row">
                <code className="param-name">{p.name}</code>
                <input
                  type="text"
                  className="field-input param-input"
                  value={p.value}
                  onChange={(e) => updateParam(p.name, e.target.value)}
                  placeholder={p.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sandbox-section">
        <label className="field-label">Headers</label>
        {headers.map((h, i) => (
          <div key={i} className="sandbox-header-row">
            <input
              type="text"
              className="field-input header-name"
              value={h.name}
              onChange={(e) => updateHeader(i, 'name', e.target.value)}
              placeholder="Header name"
            />
            <input
              type="text"
              className="field-input header-value"
              value={h.value}
              onChange={(e) => updateHeader(i, 'value', e.target.value)}
              placeholder="Value"
            />
            <button className="btn-icon" onClick={() => removeHeader(i)} title="Remove header">&times;</button>
          </div>
        ))}
        <button className="btn-link" onClick={addHeader}>+ Add header</button>
      </div>

      {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
        <div className="sandbox-section">
          <label className="field-label">Request Body</label>
          <textarea
            className="field-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder='{ "key": "value" }'
          />
        </div>
      )}

      <button className="btn-execute" onClick={execute} disabled={loading}>
        {loading ? 'Sending...' : `Send ${method.toUpperCase()} Request`}
      </button>

      {error && (
        <div className="sandbox-error">
          <div className="result-label">Error</div>
          <pre className="error-content">{error}</pre>
        </div>
      )}

      {result && !error && (
        <div className="sandbox-result">
          <div className="result-header">
            <span className={`result-status result-status-${String(result.statusCode)[0]}`}>
              {result.statusCode}
            </span>
            <span className="result-timing">{result.timingMs}ms</span>
            {result.mode && <span className="result-mode">{result.mode}</span>}
          </div>

          <div className="result-label">Response Headers</div>
          <pre className="result-headers">
            {Object.entries(result.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
          </pre>

          <div className="result-label">Response Body</div>
          <pre className="result-body">{formatBody(result.body)}</pre>
        </div>
      )}
    </div>
  );
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function generateExample(schema: any): any {
  if (!schema) return {};
  if (schema.example) return schema.example;
  if (schema.type === 'object' && schema.properties) {
    const obj: any = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateExample(prop);
    }
    return obj;
  }
  if (schema.type === 'array') return [generateExample(schema.items)];
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'string': return 'string';
    case 'number': return 0;
    case 'boolean': return true;
    case 'integer': return 0;
    default: return null;
  }
}
