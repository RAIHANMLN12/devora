export interface DevoraConfig {
  version: number;
  scan: ScanConfig;
  llm: LLMConfig;
  docs: DocsConfig;
  sandbox: SandboxConfig;
}

export interface ScanConfig {
  include: string[];
  exclude: string[];
  framework: 'auto' | 'express' | 'fastify' | 'fastapi' | 'flask';
}

export interface LLMConfig {
  provider: 'auto' | 'openai' | 'anthropic' | 'ollama';
  model: string;
  temperature: number;
  enabled: boolean;
}

export interface DocsConfig {
  title: string;
  theme: 'dark' | 'light' | 'auto';
  port: number;
}

export interface SandboxConfig {
  port: number;
  proxyTarget: string;
  mock: boolean;
  cors: boolean;
}

export type SupportedLanguage = 'javascript' | 'typescript' | 'python';
export type SupportedFramework = 'express' | 'fastify' | 'fastapi' | 'flask';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface DetectionResult {
  language: SupportedLanguage;
  framework: SupportedFramework;
  version?: string;
  confidence: number;
}

export type CommandName = 'init' | 'scan' | 'docs' | 'sandbox' | 'serve' | 'watch';

export interface Route {
  method: HttpMethod;
  path: string;
  handler: string;
  params: Param[];
  queryParams: Param[];
  body?: Schema;
  responses: Response[];
  middleware: string[];
  tags: string[];
  summary?: string;
  description?: string;
  filePath: string;
  lineNumber: number;
}

export interface Param {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface Response {
  statusCode: number;
  contentType: string;
  schema?: Schema;
  description?: string;
}

export interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  description?: string;
}

export interface ScannerResult {
  routes: Route[];
  spec: OpenApiSpec;
  outputPath: string;
  framework: SupportedFramework;
  language: SupportedLanguage;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: OpenApiSchema }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: OpenApiSchema }>;
  }>;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
}

export interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  description?: string;
  nullable?: boolean;
}
