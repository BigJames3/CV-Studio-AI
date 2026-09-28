import {
  buildOptimizeResumeMessages,
  OPTIMIZE_RESUME_PROMPT_ID,
  OPTIMIZE_RESUME_PROMPT_VERSION,
  type OptimizeResumeInput,
  type OptimizeResumeResult,
  type OptimizeVariant,
} from '../prompts/optimize-resume';
import {
  buildGrammarCheckMessages,
  GRAMMAR_CHECK_PROMPT_ID,
  GRAMMAR_CHECK_PROMPT_VERSION,
  type GrammarCheckInput,
  type GrammarCheckResult,
  type GrammarEdit,
} from '../prompts/grammar-check';
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

export type OpenAiOptions = {
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
};

/** One JSON-mode Chat Completions call; throws on any transport or empty-content failure. */
async function requestChatJson(
  label: string,
  defaultModel: string,
  messages: { system: string; user: string },
  settings: { temperature: number; maxTokens: number },
  options?: OpenAiOptions
): Promise<{ content: string; model: string; tokensUsed: number }> {
  const env = options?.env ?? process.env;
  const apiKey = options?.apiKey ?? env.OPENAI_API_KEY ?? env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY (or AI_API_KEY) is required for openai provider');
  }

  const baseUrl = (options?.baseUrl ?? env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    ''
  );
  const model = options?.model ?? env.OPENAI_MODEL ?? defaultModel;
  const fetchImpl: FetchLike =
    options?.fetchImpl ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike);
  if (!fetchImpl) {
    throw new Error('fetch is not available in this runtime');
  }

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI ${label} failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI ${label} returned empty content`);
  }
  return {
    content,
    model: payload.model ?? model,
    tokensUsed: payload.usage?.total_tokens ?? 0,
  };
}

/**
 * OpenAI-compatible Chat Completions caller (OpenAI, Azure OpenAI, local gateways).
 */
export async function optimizeResumeWithOpenAi(
  input: OptimizeResumeInput,
  options?: OpenAiOptions
): Promise<OpenAiOptimizeResult> {
  const { content, model, tokensUsed } = await requestChatJson(
    'optimize',
    resolveModel('optimize-resume', input.jobDescription ? 'gpt-4o' : undefined),
    buildOptimizeResumeMessages(input),
    { temperature: 0.35, maxTokens: 800 },
    options
  );

  const parsed = parseOptimizeJson(content);
  if (!parsed) {
    throw new Error('OpenAI optimize returned invalid JSON schema');
  }

  return { result: parsed, model, tokensUsed };
}

/** Numbers, emails and URLs: facts a proofreader must never change. */
function protectedTokens(text: string): string {
  return (text.match(/[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/\S+|\d+(?:[.,]\d+)?/g) ?? [])
    .sort()
    .join('|');
}

export type OpenAiGrammarResult = {
  result: GrammarCheckResult;
  model: string;
  tokensUsed: number;
};

/**
 * LLM proofreading. The answer is rejected (the caller falls back to rules) when it changes a
 * number, email or URL, or rewrites the text too much to be a correction.
 */
export async function grammarCheckWithOpenAi(
  input: GrammarCheckInput,
  language: 'fr' | 'en',
  options?: OpenAiOptions
): Promise<OpenAiGrammarResult> {
  const { content, model, tokensUsed } = await requestChatJson(
    'grammar check',
    resolveModel('grammar-check'),
    buildGrammarCheckMessages(input, language),
    { temperature: 0, maxTokens: 4000 },
    options
  );

  let parsed: { correctedText?: unknown; edits?: unknown };
  try {
    parsed = JSON.parse(stripCodeFences(content)) as typeof parsed;
  } catch {
    throw new Error('OpenAI grammar check returned invalid JSON');
  }
  const correctedText = typeof parsed.correctedText === 'string' ? parsed.correctedText : '';
  if (!correctedText.trim()) {
    throw new Error('OpenAI grammar check returned no text');
  }
  const drift = Math.abs(correctedText.length - input.text.length) / input.text.length;
  if (drift > 0.3 || protectedTokens(correctedText) !== protectedTokens(input.text)) {
    throw new Error('OpenAI grammar check changed facts or rewrote the text');
  }

  // Locate each quoted edit in the input, in order; edits it cannot find are dropped.
  const edits: GrammarEdit[] = [];
  let from = 0;
  for (const raw of Array.isArray(parsed.edits) ? parsed.edits : []) {
    const edit = raw as { original?: unknown; replacement?: unknown; message?: unknown };
    if (typeof edit.original !== 'string' || typeof edit.replacement !== 'string') continue;
    if (!edit.original) continue;
    const offset = input.text.indexOf(edit.original, from);
    if (offset < 0) continue;
    edits.push({
      offset,
      original: edit.original,
      replacement: edit.replacement,
      rule: 'llm',
      message: typeof edit.message === 'string' ? edit.message : 'Correction',
    });
    from = offset + edit.original.length;
  }

  return {
    result: {
      ok: true,
      promptId: GRAMMAR_CHECK_PROMPT_ID,
      promptVersion: GRAMMAR_CHECK_PROMPT_VERSION,
      language,
      correctedText,
      edits,
      warnings: [],
      refusals: [],
    },
    model,
    tokensUsed,
  };
}
