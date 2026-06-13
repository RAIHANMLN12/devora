export interface EnrichmentResult {
  summary: string;
  description: string;
  paramDescriptions: Record<string, string>;
  exampleBody: Record<string, unknown> | null;
  exampleResponse: Record<string, unknown> | null;
}

export const SYSTEM_PROMPT = `You are an expert API documentation generator. Given a route extracted from source code, generate concise, accurate documentation.

Rules:
- summary: One short line (max 60 chars) describing what the endpoint does
- description: 1-3 sentences explaining the endpoint's purpose, what it returns, and any side effects
- paramDescriptions: Object mapping each parameter name to a clear description of what it represents
- exampleBody: Realistic JSON example for request body (only for POST/PUT/PATCH, otherwise null)
- exampleResponse: Realistic JSON example for a successful response

Be precise and technically accurate. Use the parameter types and any code context hints to infer the actual data shape.

Examples:

Input: GET /api/users/:id  Parameters: id: string (required)
Output: {"summary":"Get user by ID","description":"Retrieves a single user by their unique identifier. Returns the full user profile including name, email, and avatar URL.","paramDescriptions":{"id":"The unique identifier of the user"},"exampleBody":null,"exampleResponse":{"id":"usr_123","name":"Jane Doe","email":"jane@example.com","avatar":"https://example.com/avatars/usr_123.png"}}

Input: POST /api/users  Parameters: none
Output: {"summary":"Create a new user","description":"Creates a new user account with the provided information. Returns the created user object with a generated ID.","paramDescriptions":{},"exampleBody":{"name":"Jane Doe","email":"jane@example.com"},"exampleResponse":{"id":"usr_124","name":"Jane Doe","email":"jane@example.com","createdAt":"2024-01-15T10:30:00Z"}}

Input: DELETE /api/items/:id  Parameters: id: string (required)
Output: {"summary":"Delete an item","description":"Permanently removes an item from the database by its ID. Returns a confirmation message.","paramDescriptions":{"id":"The unique identifier of the item to delete"},"exampleBody":null,"exampleResponse":{"message":"Item deleted successfully","id":"item_42"}}

Respond ONLY with valid JSON matching the schema:
{ "summary": string, "description": string, "paramDescriptions": Record<string, string>, "exampleBody": object|null, "exampleResponse": object|null }`;

export function buildEnrichmentMessages(route: {
  method: string;
  path: string;
  params: { name: string; type: string; required: boolean }[];
  queryParams?: { name: string; type: string; required: boolean }[];
  summary?: string | null;
  description?: string | null;
}, codeContext?: string): { system: string; user: string } {
  const parts: string[] = [];
  parts.push(`Route: ${route.method} ${route.path}`);

  if (route.params.length > 0) {
    parts.push('Path Parameters:\n' + route.params.map((p) => `  - ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n'));
  }
  if (route.queryParams && route.queryParams.length > 0) {
    parts.push('Query Parameters:\n' + route.queryParams.map((p) => `  - ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n'));
  }

  if (codeContext) {
    parts.push('Code context:\n' + codeContext);
  }

  if (route.summary) parts.push(`Existing summary: ${route.summary}`);
  if (route.description) parts.push(`Existing description: ${route.description}`);

  parts.push('');
  parts.push('Generate summary, description, parameter descriptions, and example payloads.');

  return { system: SYSTEM_PROMPT, user: parts.join('\n') };
}

export function parseEnrichmentResponse(text: string): EnrichmentResult {
  try {
    const parsed = JSON.parse(text);
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      paramDescriptions: typeof parsed.paramDescriptions === 'object' && parsed.paramDescriptions !== null ? parsed.paramDescriptions : {},
      exampleBody: parsed.exampleBody || null,
      exampleResponse: parsed.exampleResponse || null,
    };
  } catch {
    return {
      summary: '',
      description: '',
      paramDescriptions: {},
      exampleBody: null,
      exampleResponse: null,
    };
  }
}
