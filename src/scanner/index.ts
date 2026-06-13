import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { detectProject } from '../detector/index.js';
import { loadConfig } from '../config/index.js';
import { getExtractor } from './extractors/index.js';
import { inferRouteSchemas } from './inferencer/index.js';
import { buildOpenApiSpec, writeOpenApiSpec } from './builder/index.js';
import type { SupportedFramework, SupportedLanguage } from '../types/index.js';

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
}

export interface ScanSummary {
  routesCount: number;
  filesCount: number;
  framework: string;
  language: string;
  outputPath: string;
  enrichedCount: number;
  totalCount: number;
}

export async function scan(cwd: string, options?: ScanOptions): Promise<ScanSummary> {
  const config = await loadConfig(cwd);
  const detection = detectProject(cwd);

  if (!detection) {
    throw new Error(
      'Could not detect a supported framework. Supported: Express, Fastify, FastAPI, Flask\n' +
      'Run `devora init` to configure manually.'
    );
  }

  const framework = detection.framework;
  const language = detection.language;

  const extractor = getExtractor(framework);

  const includePatterns = (options?.include ?? config.scan.include)
    .map((p) => resolve(cwd, p));

  const routes = extractor(includePatterns);
  const filesCount = new Set(routes.map((r) => r.filePath)).size;

  const enrichedRoutes = inferRouteSchemas(routes);

  const title = config.docs.title === 'auto'
    ? `${framework.charAt(0).toUpperCase() + framework.slice(1)} API`
    : config.docs.title;

  const spec = buildOpenApiSpec(enrichedRoutes, { title });

  const outputDir = resolve(cwd, '.devora');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = resolve(outputDir, 'openapi.json');
  writeOpenApiSpec(spec, outputPath);

  return {
    routesCount: enrichedRoutes.length,
    filesCount,
    framework,
    language,
    outputPath,
    enrichedCount: 0,
    totalCount: enrichedRoutes.length,
  };
}
