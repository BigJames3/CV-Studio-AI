import {
  buildOptimizeResumeMessages,
  OPTIMIZE_RESUME_PROMPT_ID,
  OPTIMIZE_RESUME_PROMPT_VERSION,
  type OptimizeResumeInput,
  type OptimizeResumeResult,
  type OptimizeVariant,
} from '../prompts/optimize-resume';
import { resolveModel } from '../routing';

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { total_tokens?: number };
  model?: string;
};

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseOptimizeJson(content: string): OptimizeResumeResult | null {
  try {
    const parsed = JSON.parse(stripCodeFences(content)) as {
      ok?: boolean;
      variants?: OptimizeVariant[];
      warnings?: string[];
      refusals?: string[];
    };
    if (!Array.isArray(parsed.variants) || parsed.variants.length === 0) {
      return null;
    }
    return {
      ok: parsed.ok !== false,
      variants: parsed.variants.slice(0, 3).map((v) => ({
        text: String(v.text ?? '').trim(),
        rationale: String(v.rationale ?? '').trim() || 'Improved clarity',
        atsNotes: v.atsNotes ? String(v.atsNotes) : undefined,
      })),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      refusals: Array.isArray(parsed.refusals) ? parsed.refusals.map(String) : [],
      promptId: OPTIMIZE_RESUME_PROMPT_ID,
      promptVersion: OPTIMIZE_RESUME_PROMPT_VERSION,
    };
  } catch {
    return null;
  }
}

export type OpenAiOptimizeResult = {
  result: OptimizeResumeResult;
  model: string;
  tokensUsed: number;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}>;

/**
 * OpenAI-compatible Chat Completions caller (OpenAI, Azure OpenAI, local gateways).
 */
export async function optimizeResumeWithOpenAi(
  input: OptimizeResumeInput,
  options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    fetchImpl?: FetchLike;
    env?: {
      OPENAI_API_KEY?: string;
      AI_API_KEY?: string;
      OPENAI_BASE_URL?: string;
      OPENAI_MODEL?: string;
    };
  }
): Promise<OpenAiOptimizeResult> {
  const env = options?.env ?? process.env;
  const apiKey = options?.apiKey ?? env.OPENAI_API_KEY ?? env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY (or AI_API_KEY) is required for openai provider');
  }

  const baseUrl = (options?.baseUrl ?? env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    ''
  );
  const model =
    options?.model ??
    env.OPENAI_MODEL ??
    resolveModel('optimize-resume', input.jobDescription ? 'gpt-4o' : undefined);
  const fetchImpl: FetchLike =
    options?.fetchImpl ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike);
  if (!fetchImpl) {
    throw new Error('fetch is not available in this runtime');
  }
  const { system, user } = buildOptimizeResumeMessages(input);

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI optimize failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI optimize returned empty content');
  }

  const parsed = parseOptimizeJson(content);
  if (!parsed) {
    throw new Error('OpenAI optimize returned invalid JSON schema');
  }

  return {
    result: parsed,
    model: payload.model ?? model,
    tokensUsed: payload.usage?.total_tokens ?? 0,
  };
}
