import type { LLMConfig } from '../types/index.js';
import { logger } from '../utils/index.js';

export interface ProviderResult {
  content: string;
  model: string;
  provider: string;
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string; apiKeyEnv: string[] }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKeyEnv: ['LLM_API_KEY', 'OPENAI_API_KEY'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    apiKeyEnv: ['LLM_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3',
    apiKeyEnv: [],
  },
};

function loadApiKey(): string | null {
  return process.env.LLM_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.ANTHROPIC_API_KEY
    || null;
}

function detectProviderFromKey(key: string): 'openai' | 'anthropic' | null {
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-')) return 'openai';
  return null;
}

export function resolveProvider(config: LLMConfig): { provider: string; model: string; baseUrl: string; apiKey: string | null } | null {
  if (!config.enabled) return null;

  const apiKey = loadApiKey();
  const requested = config.provider === 'auto' ? (apiKey ? detectProviderFromKey(apiKey) || 'openai' : 'ollama') : config.provider;

  if (requested === 'ollama') {
    return {
      provider: 'ollama',
      model: config.model === 'auto' ? PROVIDER_DEFAULTS.ollama.model : config.model,
      baseUrl: PROVIDER_DEFAULTS.ollama.baseUrl,
      apiKey: null,
    };
  }

  if (requested === 'anthropic' || requested === 'openai') {
    if (!apiKey) return null;
    const defaults = PROVIDER_DEFAULTS[requested];
    return {
      provider: requested,
      model: config.model === 'auto' ? defaults.model : config.model,
      baseUrl: defaults.baseUrl,
      apiKey,
    };
  }

  return null;
}

export async function callLLM(
  resolved: { provider: string; model: string; baseUrl: string; apiKey: string | null },
  systemPrompt: string,
  userMessage: string,
  temperature: number
): Promise<ProviderResult | null> {
  try {
    if (resolved.provider === 'anthropic') {
      return callAnthropic(resolved, systemPrompt, userMessage, temperature);
    }
    return callOpenAICompatible(resolved, systemPrompt, userMessage, temperature);
  } catch (err) {
    logger.warn(`LLM call failed (${resolved.provider}/${resolved.model}): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function callOpenAICompatible(
  resolved: { provider: string; model: string; baseUrl: string; apiKey: string | null },
  systemPrompt: string,
  userMessage: string,
  temperature: number
): Promise<ProviderResult> {
  const url = `${resolved.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (resolved.apiKey) headers['Authorization'] = `Bearer ${resolved.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: resolved.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const data = await response.json() as any;
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || resolved.model,
    provider: resolved.provider,
  };
}

async function callAnthropic(
  resolved: { provider: string; model: string; baseUrl: string; apiKey: string | null },
  systemPrompt: string,
  userMessage: string,
  temperature: number
): Promise<ProviderResult> {
  const url = `${resolved.baseUrl.replace(/\/+$/, '')}/messages`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': resolved.apiKey || '',
    'anthropic-version': '2023-06-01',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: resolved.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json() as any;
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || resolved.model,
    provider: resolved.provider,
  };
}
