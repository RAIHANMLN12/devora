import { readFileSync } from 'fs';
import type { Route, LLMConfig } from '../types/index.js';
import { buildEnrichmentMessages, parseEnrichmentResponse } from './prompts.js';
import { resolveProvider, callLLM } from './provider.js';
import { logger } from '../utils/index.js';

const CONTEXT_LINES = 10;

function readCodeContext(filePath: string, lineNumber: number): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - CONTEXT_LINES);
    const end = Math.min(lines.length, lineNumber + CONTEXT_LINES);
    return lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
  } catch {
    return undefined;
  }
}

export interface EnrichmentStats {
  enriched: number;
  skipped: number;
  total: number;
  provider: string;
  model: string;
}

export async function enrichRoutes(routes: Route[], config: LLMConfig, cwd: string): Promise<{ routes: Route[]; stats: EnrichmentStats }> {
  if (!config.enabled || routes.length === 0) {
    return {
      routes,
      stats: { enriched: 0, skipped: routes.length, total: routes.length, provider: 'none', model: 'none' },
    };
  }

  const resolved = resolveProvider(config);
  if (!resolved) {
    logger.warn('No LLM provider configured. Set LLM_API_KEY or OPENAI_API_KEY in .env');
    return {
      routes,
      stats: { enriched: 0, skipped: routes.length, total: routes.length, provider: 'none', model: 'none' },
    };
  }

  let enrichedCount = 0;
  let skippedCount = 0;

  const enrichedRoutes = await Promise.all(routes.map(async (route) => {
    try {
      const codeContext = readCodeContext(route.filePath, route.lineNumber);
      const { system, user } = buildEnrichmentMessages(route, codeContext);
      const result = await callLLM(resolved, system, user, config.temperature);

      if (!result || !result.content) {
        skippedCount++;
        return route;
      }

      const parsed = parseEnrichmentResponse(result.content);
      enrichedCount++;

      return {
        ...route,
        summary: parsed.summary || route.summary,
        description: parsed.description || route.description,
        params: route.params.map((p) => ({
          ...p,
          description: parsed.paramDescriptions[p.name] || p.description,
        })),
        queryParams: route.queryParams.map((p) => ({
          ...p,
          description: parsed.paramDescriptions[p.name] || p.description,
        })),
        responses: route.responses.length > 0 ? route.responses.map((r) => {
          if (r.statusCode >= 200 && r.statusCode < 300 && parsed.exampleResponse && !r.schema) {
            return {
              ...r,
              schema: {
                type: 'object' as const,
                properties: Object.fromEntries(
                  Object.entries(parsed.exampleResponse).map(([k]) => [k, { type: 'string' as const }])
                ),
              },
              description: r.description || 'Success',
            };
          }
          return r;
        }) : [{
          statusCode: 200,
          contentType: 'application/json',
          schema: parsed.exampleResponse ? {
            type: 'object' as const,
            properties: Object.fromEntries(
              Object.entries(parsed.exampleResponse).map(([k]) => [k, { type: 'string' as const }])
            ),
          } : undefined,
          description: 'Success',
        }],
        tags: route.tags.length > 0 ? route.tags : (parsed.summary ? [parsed.summary.split(' ')[0]] : []),
      } satisfies Route;
    } catch {
      skippedCount++;
      return route;
    }
  }));

  return {
    routes: enrichedRoutes,
    stats: {
      enriched: enrichedCount,
      skipped: skippedCount,
      total: routes.length,
      provider: resolved.provider,
      model: resolved.model,
    },
  };
}
