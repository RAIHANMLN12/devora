import React, { useState } from 'react';
import { SchemaViewer } from './SchemaViewer.js';
import { SandboxPanel } from './SandboxPanel.js';

interface EndpointViewProps {
  path: string;
  method: string;
  operation: any;
  spec: any;
}

const METHOD_BADGE: Record<string, { class: string; label: string }> = {
  get: { class: 'method-get', label: 'GET' },
  post: { class: 'method-post', label: 'POST' },
  put: { class: 'method-put', label: 'PUT' },
  patch: { class: 'method-patch', label: 'PATCH' },
  delete: { class: 'method-delete', label: 'DELETE' },
  head: { class: 'method-head', label: 'HEAD' },
  options: { class: 'method-options', label: 'OPTIONS' },
};

export function EndpointView({ path, method, operation }: EndpointViewProps) {
  if (!operation) return <div className="empty">Operation not found.</div>;
  const [showTest, setShowTest] = useState(false);

  const badge = METHOD_BADGE[method] || { class: '', label: method.toUpperCase() };
  const params = operation.parameters || [];
  const pathParams = params.filter((p: any) => p.in === 'path');
  const queryParams = params.filter((p: any) => p.in === 'query');
  const headerParams = params.filter((p: any) => p.in === 'header');
  const requestBody = operation.requestBody;
  const responses = operation.responses || {};

  return (
    <div className="endpoint-detail">
      <div className="endpoint-header">
        <span className={`endpoint-badge ${badge.class}`}>{badge.label}</span>
        <code className="endpoint-path">{path}</code>
        <button className={`btn-test ${showTest ? 'active' : ''}`} onClick={() => setShowTest(!showTest)}>
          {showTest ? 'Close Test' : 'Test'}
        </button>
      </div>

      {showTest && <SandboxPanel path={path} method={method} operation={operation} />}

      {operation.summary && <p className="endpoint-summary-text">{operation.summary}</p>}
      {operation.description && <p className="endpoint-description">{operation.description}</p>}

      {operation.tags && operation.tags.length > 0 && (
        <div className="tags">
          {operation.tags.map((t: string) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      {pathParams.length > 0 && (
        <section className="section">
          <h3 className="section-title">Path Parameters</h3>
          <ParamTable params={pathParams} />
        </section>
      )}

      {queryParams.length > 0 && (
        <section className="section">
          <h3 className="section-title">Query Parameters</h3>
          <ParamTable params={queryParams} />
        </section>
      )}

      {headerParams.length > 0 && (
        <section className="section">
          <h3 className="section-title">Header Parameters</h3>
          <ParamTable params={headerParams} />
        </section>
      )}

      {requestBody && (
        <section className="section">
          <h3 className="section-title">Request Body</h3>
          {requestBody.description && <p className="section-desc">{requestBody.description}</p>}
          <div className="request-body-info">
            {requestBody.required && <span className="badge-required">Required</span>}
          </div>
          {requestBody.content && renderContentSchemas(requestBody.content)}
        </section>
      )}

      <section className="section">
        <h3 className="section-title">Responses</h3>
        {Object.entries(responses).map(([statusCode, response]: [string, any]) => (
          <div key={statusCode} className="response-card">
            <div className="response-header">
              <span className={`status-badge status-${statusCode[0]}`}>{statusCode}</span>
              <span className="response-desc">{response.description || ''}</span>
            </div>
            {response.content && renderContentSchemas(response.content)}
          </div>
        ))}
      </section>
    </div>
  );
}

function ParamTable({ params }: { params: any[] }) {
  return (
    <div className="param-table-wrapper">
      <table className="param-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name}>
              <td><code>{p.name}</code></td>
              <td>{p.schema?.type || 'string'}</td>
              <td>{p.required ? <span className="yes">Yes</span> : 'No'}</td>
              <td>{p.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderContentSchemas(content: Record<string, any>) {
  return Object.entries(content).map(([contentType, mediaType]) => (
    <div key={contentType} className="content-type-block">
      <div className="content-type-label">{contentType}</div>
      {mediaType.schema && <SchemaViewer schema={mediaType.schema} />}
    </div>
  ));
}
