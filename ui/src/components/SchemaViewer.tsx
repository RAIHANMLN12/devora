import React from 'react';

interface SchemaViewerProps {
  schema: any;
  depth?: number;
}

export function SchemaViewer({ schema, depth = 0 }: SchemaViewerProps) {
  if (!schema) return <span className="schema-type">any</span>;

  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="schema-object">
        {depth > 0 && <span className="schema-type">object</span>}
        <div className="schema-properties">
          {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
            <div key={key} className="schema-property">
              <div className="schema-property-header">
                <code className="schema-key">{key}</code>
                <SchemaTypeTag type={prop.type || inferType(prop)} />
                {schema.required?.includes(key) && <span className="schema-required">required</span>}
              </div>
              {prop.description && <p className="schema-desc">{prop.description}</p>}
              {prop.type === 'object' && prop.properties && depth < 3 && (
                <SchemaViewer schema={prop} depth={depth + 1} />
              )}
              {prop.type === 'array' && prop.items && (
                <div className="schema-array-items">
                  <span className="schema-type-label">Array items:</span>
                  <SchemaViewer schema={prop.items} depth={depth + 1} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (schema.type === 'array') {
    return (
      <div className="schema-array">
        <span className="schema-type">array</span>
        {schema.items && (
          <div className="schema-array-items">
            <SchemaViewer schema={schema.items} depth={depth + 1} />
          </div>
        )}
      </div>
    );
  }

  if (schema.enum) {
    return (
      <span className="schema-type">
        enum {schema.enum.map((v: any) => `"${v}"`).join(' | ')}
      </span>
    );
  }

  return <span className="schema-type">{schema.type || 'any'}</span>;
}

function SchemaTypeTag({ type }: { type: string }) {
  return <span className={`schema-type-tag schema-tag-${type}`}>{type}</span>;
}

function inferType(prop: any): string {
  if (prop.properties) return 'object';
  if (prop.items) return 'array';
  if (prop.enum) return 'enum';
  if (prop.type) return prop.type;
  return 'any';
}
