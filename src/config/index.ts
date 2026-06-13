import { cosmiconfig } from 'cosmiconfig';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import type { DevoraConfig, ScanConfig, LLMConfig, DocsConfig, SandboxConfig } from '../types/index.js';

const CONFIG_MODULE_NAME = 'devora';

const defaultConfig: DevoraConfig = {
  version: 1,
  scan: {
    include: ['src/**/*.js', 'src/**/*.ts', 'routes/**/*.js'],
    exclude: ['**/*.test.*', '**/node_modules/**', '**/dist/**'],
    framework: 'auto',
  },
  llm: {
    provider: 'auto',
    model: 'auto',
    temperature: 0.2,
    enabled: true,
  },
  docs: {
    title: 'auto',
    theme: 'dark',
    port: 3456,
  },
  sandbox: {
    port: 3457,
    proxyTarget: 'auto',
    mock: false,
    cors: true,
  },
};

export function getDefaultConfig(): DevoraConfig {
  return structuredClone(defaultConfig);
}

export async function loadConfig(cwd: string = process.cwd()): Promise<DevoraConfig> {
  const explorer = cosmiconfig(CONFIG_MODULE_NAME, {
    searchPlaces: [
      '.devora/config',
      '.devora/config.json',
      '.devora/config.yaml',
      '.devora/config.yml',
      'package.json',
    ],
    packageProp: 'devora',
    stopDir: dirname(cwd),
  });

  const result = await explorer.search(cwd);
  const config = getDefaultConfig();

  if (result && !result.isEmpty) {
    const partial = result.config as Partial<DevoraConfig>;
    if (partial.scan) Object.assign(config.scan, partial.scan);
    if (partial.llm) Object.assign(config.llm, partial.llm);
    if (partial.docs) Object.assign(config.docs, partial.docs);
    if (partial.sandbox) Object.assign(config.sandbox, partial.sandbox);
  }

  return config;
}

export function writeConfig(cwd: string, config: DevoraConfig): string {
  const configDir = resolve(cwd, '.devora');
  const configPath = resolve(configDir, 'config');

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const yaml = serializeYaml(config);
  writeFileSync(configPath, yaml, 'utf-8');
  return configPath;
}

function serializeYaml(config: DevoraConfig): string {
  const lines: string[] = ['# Devora Configuration', `version: ${config.version}`, ''];
  lines.push('scan:');
  lines.push(`  include: ${JSON.stringify(config.scan.include)}`);
  lines.push(`  exclude: ${JSON.stringify(config.scan.exclude)}`);
  lines.push(`  framework: ${config.scan.framework}`);
  lines.push('');
  lines.push('llm:');
  lines.push(`  provider: ${config.llm.provider}`);
  lines.push(`  model: ${config.llm.model}`);
  lines.push(`  temperature: ${config.llm.temperature}`);
  lines.push(`  enabled: ${config.llm.enabled}`);
  lines.push('');
  lines.push('docs:');
  lines.push(`  title: ${config.docs.title}`);
  lines.push(`  theme: ${config.docs.theme}`);
  lines.push(`  port: ${config.docs.port}`);
  lines.push('');
  lines.push('sandbox:');
  lines.push(`  port: ${config.sandbox.port}`);
  lines.push(`  proxyTarget: ${config.sandbox.proxyTarget}`);
  lines.push(`  mock: ${config.sandbox.mock}`);
  lines.push(`  cors: ${config.sandbox.cors}`);
  return lines.join('\n') + '\n';
}
