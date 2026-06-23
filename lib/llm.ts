import fs from 'node:fs';
import path from 'node:path';

export type LlmRole = 'vision' | 'analysis';
export type LlmProvider = 'disabled' | 'fake' | 'openai-compatible';

export type LlmMessagePart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmMessagePart[];
}

export interface LlmRoleConfig {
  provider: LlmProvider;
  model?: string;
  endpoint?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  configVersion?: string;
}

interface LlmConfigFile {
  roles?: Partial<Record<LlmRole, Partial<LlmRoleConfig>>>;
}

export class LlmConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigurationError';
  }
}

const DEFAULT_ROLE_CONFIG: Record<LlmRole, LlmRoleConfig> = {
  vision: { provider: 'disabled', configVersion: 'disabled' },
  analysis: { provider: 'disabled', configVersion: 'disabled' },
};

function readConfigFile(): LlmConfigFile {
  const configuredPath = process.env.LLM_CONFIG_PATH;
  const defaultPath = path.join(process.cwd(), 'config', 'llm.config.json');
  const configPath = configuredPath || defaultPath;

  if (!fs.existsSync(configPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as LlmConfigFile;
  } catch (error: any) {
    throw new LlmConfigurationError(`LLM config file could not be parsed: ${error.message}`);
  }
}

function envName(role: LlmRole, suffix: string): string {
  return `LLM_${role.toUpperCase()}_${suffix}`;
}

function providerFrom(value: string | undefined): LlmProvider | undefined {
  if (!value) return undefined;
  if (value === 'disabled' || value === 'fake' || value === 'openai-compatible') return value;
  throw new LlmConfigurationError(`Unsupported LLM provider "${value}". Use disabled, fake, or openai-compatible.`);
}

export function getLlmRoleConfig(role: LlmRole): LlmRoleConfig {
  const fileConfig = readConfigFile().roles?.[role] || {};
  const provider = providerFrom(process.env[envName(role, 'PROVIDER')]) || fileConfig.provider || DEFAULT_ROLE_CONFIG[role].provider;

  return {
    ...DEFAULT_ROLE_CONFIG[role],
    ...fileConfig,
    provider,
    model: process.env[envName(role, 'MODEL')] || fileConfig.model,
    endpoint: process.env[envName(role, 'ENDPOINT')] || fileConfig.endpoint,
    apiKeyEnv: process.env[envName(role, 'API_KEY_ENV')] || fileConfig.apiKeyEnv,
    temperature: Number(process.env[envName(role, 'TEMPERATURE')] || fileConfig.temperature || 0.2),
    maxTokens: Number(process.env[envName(role, 'MAX_TOKENS')] || fileConfig.maxTokens || (role === 'analysis' ? 700 : 350)),
    configVersion: process.env[envName(role, 'CONFIG_VERSION')] || fileConfig.configVersion || provider,
  };
}

export function getLlmConfigFingerprint(role: LlmRole): string {
  const config = getLlmRoleConfig(role);
  return JSON.stringify({
    role,
    provider: config.provider,
    model: config.model || '',
    endpoint: config.endpoint || '',
    configVersion: config.configVersion || '',
    maxTokens: config.maxTokens || 0,
  });
}

export async function runLlmRole(role: LlmRole, messages: LlmMessage[]): Promise<string> {
  const config = getLlmRoleConfig(role);

  if (config.provider === 'disabled') {
    throw new LlmConfigurationError(`LLM role "${role}" is disabled. Configure ${envName(role, 'PROVIDER')} or config/llm.config.json to enable it.`);
  }

  if (config.provider === 'fake') {
    return fakeResponse(role);
  }

  if (!config.endpoint || !config.model) {
    throw new LlmConfigurationError(`LLM role "${role}" requires endpoint and model configuration.`);
  }

  const apiKey = config.apiKey || (config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined);
  if (!apiKey) {
    throw new LlmConfigurationError(`LLM role "${role}" is missing an API key. Set ${config.apiKeyEnv || envName(role, 'API_KEY_ENV')} to an environment variable containing the key.`);
  }

  const requestBody: Record<string, any> = {
    model: config.model,
    messages,
    temperature: config.temperature ?? 0.2,
  };

  const usesOpenAiCompletionTokens =
    config.endpoint.includes('api.openai.com') ||
    config.model.toLowerCase().startsWith('gpt-5');

  if (usesOpenAiCompletionTokens) {
    requestBody.max_completion_tokens = config.maxTokens;
  } else {
    requestBody.max_tokens = config.maxTokens;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`LLM provider returned ${response.status}: ${body?.error?.message || response.statusText}`);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM provider response did not include message content.');
  }

  return content;
}

function fakeResponse(role: LlmRole): string {
  if (role === 'vision') {
    return JSON.stringify({
      name: 'Example configured meal',
      calories: 420,
      protein: 20,
      carbs: 48,
      fat: 14,
    });
  }

  return JSON.stringify({
    summary: 'Fake analysis mode: deterministic preprocessing found candidate patterns, but no paid provider was called.',
    lowData: false,
    candidates: [
      {
        label: 'Calories and logged symptom intensity',
        explanation: 'Use this fake provider only for smoke tests. Configure an analysis role for real exploratory wording.',
        confidence: 'low',
      },
    ],
    nextSteps: ['Collect more logs across meals and symptoms before drawing conclusions.'],
    disclaimer: 'Exploratory wellness insight only; not medical advice.',
  });
}

export function extractJsonObject(text: string): any {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const first = withoutFence.indexOf('{');
  const last = withoutFence.lastIndexOf('}');
  const json = first >= 0 && last >= first ? withoutFence.slice(first, last + 1) : withoutFence;
  return JSON.parse(json);
}
