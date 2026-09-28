import type { GrammarCheckInput, GrammarCheckResult, GrammarEdit } from '../prompts/grammar-check';
import { GRAMMAR_CHECK_PROMPT_ID, GRAMMAR_CHECK_PROMPT_VERSION } from '../prompts/grammar-check';

const NBSP = '\u00a0';
const FRENCH_HINT =
  /(?<!\p{L})(le|la|les|de|des|du|une|et|est|pour|avec|dans|sur|à|au|aux|je|nous|vous|mon|mes)(?!\p{L})|[éèêàçùœ]/giu;
const ENGLISH_HINT = /(?<!\p{L})(the|and|with|for|of|to|in|is|was|my|i)(?!\p{L})/giu;
/** Abbreviations after which a lowercase word does not start a new sentence. */
const ABBREVIATIONS = /\b(e\.g|i\.e|etc|vs|cf|ex|approx|incl|resp|env|p\.ex)\.$/i;
/** Words that legitimately repeat ("nous nous sommes", "vous vous êtes"). */
const ALLOWED_REPEATS = new Set(['nous', 'vous', 'had', 'that']);

export function detectLanguage(text: string, locale?: string): 'fr' | 'en' {
  if (locale) return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const fr = text.match(FRENCH_HINT)?.length ?? 0;
  const en = text.match(ENGLISH_HINT)?.length ?? 0;
  return fr > en ? 'fr' : 'en';
}

type Rule = (text: string, language: 'fr' | 'en') => GrammarEdit[];

function matches(
  text: string,
  pattern: RegExp,
  build: (m: RegExpExecArray) => GrammarEdit | null
): GrammarEdit[] {
  const edits: GrammarEdit[] = [];
  for (const m of text.matchAll(pattern)) {
    const edit = build(m as RegExpExecArray);
    if (edit) edits.push(edit);
  }
  return edits;
}

const RULES: Rule[] = [
  // Two or more spaces inside a line.
  (text) =>
    matches(text, /(?<=\S) {2,}(?=\S)/g, (m) => ({
      offset: m.index,
      original: m[0],
      replacement: ' ',
      rule: 'whitespace',
      message: 'Extra spaces',
    })),

  // The same word twice in a row.
  (text) =>
    matches(text, /\b([\p{L}']+)(\s+)\1\b/giu, (m) => {
      if (ALLOWED_REPEATS.has(m[1].toLowerCase())) return null;
      return {
        offset: m.index,
        original: m[0],
        replacement: m[1],
        rule: 'repeated-word',
        message: `Repeated word “${m[1]}”`,
      };
    }),

  // Lowercase letter at the start of the text or of a sentence.
  (text) =>
    matches(text, /(^|[.!?]\s+)(\p{Ll})/gu, (m) => {
      const before = text.slice(0, m.index + m[1].length).trimEnd();
      if (ABBREVIATIONS.test(before)) return null;
      const offset = m.index + m[1].length;
      return {
        offset,
        original: m[2],
        replacement: m[2].toUpperCase(),
        rule: 'capitalization',
        message: 'Sentence should start with a capital letter',
      };
    }),

  // Missing space after a comma followed by a letter (not 1,5).
  (text) =>
    matches(text, /,(?=\p{L})/gu, (m) => ({
      offset: m.index,
      original: ',',
      replacement: ', ',
      rule: 'comma-space',
      message: 'Add a space after the comma',
    })),

  // No space before a comma (and one after it before a word), in both languages.
  (text) =>
    matches(text, /(?<=\S)[ \u00a0]+,(?=(\p{L})?)/gu, (m) => ({
      offset: m.index,
      original: m[0],
      replacement: m[1] ? ', ' : ',',
      rule: 'space-before-punctuation',
      message: 'No space before “,”',
    })),

  // No space before a full stop that ends a sentence (not ".NET").
  (text) =>
    matches(text, /(?<=\S)[ \u00a0]+\.(?=\s|$)/g, (m) => ({
      offset: m.index,
      original: m[0],
      replacement: '.',
      rule: 'space-before-punctuation',
      message: 'No space before “.”',
    })),

  // English: no space before ; : ! ?
  (text, language) =>
    language !== 'en'
      ? []
      : matches(text, /(?<=\S)[ \u00a0]+([;:!?])/g, (m) => ({
          offset: m.index,
          original: m[0],
          replacement: m[1],
          rule: 'space-before-punctuation',
          message: 'No space before punctuation in English',
        })),

  // French: non-breaking space before ; : ! ? (not in URLs or times such as 12:30).
  (text, language) =>
    language !== 'fr'
      ? []
      : matches(text, /(?<=[\p{L}\d)»])( ?)([;:!?])(?=\s|$)/gu, (m) => {
          if (m[2] === ':' && /\d$/.test(text.slice(0, m.index))) return null;
          return {
            offset: m.index,
            original: m[0],
            replacement: `${NBSP}${m[2]}`,
            rule: 'fr-space-before-punctuation',
            message: `French typography: non-breaking space before “${m[2]}”`,
          };
        }),

  // French quotes: non-breaking space inside « ».
  (text, language) =>
    language !== 'fr'
      ? []
      : [
          ...matches(text, /« ?(?=\S)/g, (m) =>
            m[0] === `«${NBSP}`
              ? null
              : {
                  offset: m.index,
                  original: m[0],
                  replacement: `«${NBSP}`,
                  rule: 'fr-quotes',
                  message: 'French typography: non-breaking space after «',
                }
          ),
          ...matches(text, /(?<=\S) ?»/g, (m) => ({
            offset: m.index,
            original: m[0],
            replacement: `${NBSP}»`,
            rule: 'fr-quotes',
            message: 'French typography: non-breaking space before »',
          })),
        ],
];

/** Apply non-overlapping edits (first one wins) and return the kept edits and the new text. */
export function applyEdits(text: string, edits: GrammarEdit[]) {
  const kept: GrammarEdit[] = [];
  let end = -1;
  for (const edit of [...edits].sort((a, b) => a.offset - b.offset)) {
    if (edit.offset < end || edit.original === edit.replacement) continue;
    kept.push(edit);
    end = edit.offset + edit.original.length;
  }
  let corrected = text;
  for (const edit of [...kept].reverse()) {
    corrected =
      corrected.slice(0, edit.offset) +
      edit.replacement +
      corrected.slice(edit.offset + edit.original.length);
  }
  return { edits: kept, correctedText: corrected };
}

/**
 * Rule-based proofreading: spacing, repeated words, capitalization and punctuation typography
 * (English or French). It does not check spelling; that needs the LLM provider.
 */
export function grammarCheckHeuristic(input: GrammarCheckInput): GrammarCheckResult {
  const text = input.text ?? '';
  const language = detectLanguage(text, input.locale);
  const base = {
    promptId: GRAMMAR_CHECK_PROMPT_ID,
    promptVersion: GRAMMAR_CHECK_PROMPT_VERSION,
    language,
  };
  if (!text.trim()) {
    return {
      ...base,
      ok: false,
      correctedText: text,
      edits: [],
      warnings: [],
      refusals: ['text is required'],
    };
  }
  const { edits, correctedText } = applyEdits(
    text,
    RULES.flatMap((rule) => rule(text, language))
  );
  return {
    ...base,
    ok: true,
    correctedText,
    edits,
    warnings: ['Rule-based check: spelling is not verified'],
    refusals: [],
  };
}
