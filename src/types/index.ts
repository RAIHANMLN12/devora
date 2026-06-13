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

export interface DetectionResult {
  language: SupportedLanguage;
  framework: SupportedFramework;
  version?: string;
  confidence: number;
}

export type CommandName = 'init' | 'scan' | 'docs' | 'sandbox' | 'serve' | 'watch';
