import { cvMentions, extractCvFacts, extractKeywords, type CvFacts } from '../cv-facts';
import { isKnownSkill } from '../skills-lexicon';
import type { JobMatchEdit, JobMatchInput, JobMatchResult } from '../prompts/job-match';
import { JOB_MATCH_PROMPT_ID, JOB_MATCH_PROMPT_VERSION } from '../prompts/job-match';

const REQUIRED_MARKERS =
  /\b(required|must|mandatory|essential|minimum|requirement|obligatoire|exig[ée]e?s?|indispensable|requis)\b/i;
const OPTIONAL_MARKERS =
  /\b(nice to have|a plus|bonus|preferred|ideally|optional|souhait[ée]e?s?|appr[ée]ci[ée]e?s?|atout|id[ée]alement)\b/i;

type Weighted = { keyword: string; weight: number };

/** Weight each JD keyword by the strongest marker of a sentence it appears in. */
function weightKeywords(jobDescription: string): Weighted[] {
  const sentences = jobDescription.split(/[\n.;•]+/).filter((s) => s.trim());
  const weights = new Map<string, number>();
  for (const sentence of sentences) {
    const weight = REQUIRED_MARKERS.test(sentence) ? 2 : OPTIONAL_MARKERS.test(sentence) ? 0.5 : 1;
    for (const keyword of extractKeywords(sentence)) {
      weights.set(keyword, Math.max(weights.get(keyword) ?? 0, weight));
    }
  }
  return [...weights.entries()].slice(0, 40).map(([keyword, weight]) => ({ keyword, weight }));
}

/** Where the CV supports a keyword, quoted from the CV itself. */
export function findEvidence(facts: CvFacts, keyword: string): string | null {
  for (const exp of facts.experiences) {
    const role = [exp.title, exp.company].filter(Boolean).join(' at ');
    const bullet = exp.bullets.find((b) => cvMentions(b.toLowerCase(), keyword));
    if (bullet) return `${role}: ${truncate(bullet)}`;
    if (cvMentions(role.toLowerCase(), keyword)) return role;
  }
  const skill = facts.skills.find((s) => cvMentions(s.toLowerCase(), keyword));
  if (skill) return `Skills: ${skill}`;
  for (const [label, items] of [
    ['Project', facts.projects],
    ['Certificate', facts.certificates],
    ['Education', facts.education],
  ] as const) {
    const hit = items.find((item) => cvMentions(item.toLowerCase(), keyword));
    if (hit) return `${label}: ${truncate(hit)}`;
  }
  if (cvMentions(facts.summary.toLowerCase(), keyword))
    return `Summary: ${truncate(facts.summary)}`;
  if (cvMentions(facts.headline.toLowerCase(), keyword)) return `Headline: ${facts.headline}`;
  return null;
}

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function inAnyBullet(facts: CvFacts, keyword: string): boolean {
  return facts.experiences.some((e) => e.bullets.some((b) => cvMentions(b.toLowerCase(), keyword)));
}

/**
 * Deterministic job matcher: weighted keyword coverage of the JD by the CV, with evidence
 * quoted from the CV. Gaps are reported, never filled: the candidate decides what is true.
 */
export function matchJobHeuristic(input: JobMatchInput): JobMatchResult {
  const base = {
    promptId: JOB_MATCH_PROMPT_ID,
    promptVersion: JOB_MATCH_PROMPT_VERSION,
  };
  const keywords = weightKeywords(input.jobDescription ?? '');
  if (!keywords.length) {
    return {
      ...base,
      ok: false,
      matchScore: 0,
      strengths: [],
      mustHaveGaps: [],
      niceToHaveGaps: [],
      suggestedEdits: [],
      warnings: [],
      refusals: ['jobDescription has no usable keywords'],
    };
  }

  const facts = extractCvFacts(input.cvFacts);
  const matched: Array<Weighted & { evidence: string }> = [];
  const missing: Weighted[] = [];
  for (const item of keywords) {
    const evidence = findEvidence(facts, item.keyword);
    if (evidence) matched.push({ ...item, evidence });
    else missing.push(item);
  }

  const total = keywords.reduce((sum, k) => sum + k.weight, 0);
  const covered = matched.reduce((sum, k) => sum + k.weight, 0);
  const matchScore = Math.round((covered / total) * 100);

  const gap = (keyword: string) => ({
    requirement: keyword,
    reason: 'Not found in your CV. Add it only if you have real experience with it.',
  });

  const suggestedEdits: JobMatchEdit[] = matched
    .filter((m) => m.weight >= 1 && isKnownSkill(m.keyword) && !inAnyBullet(facts, m.keyword))
    .slice(0, 3)
    .map((m) => ({
      target: 'experience',
      suggestion: `“${m.keyword}” only appears in ${m.evidence.split(':')[0]}. If you used it in a role, say how in that role's bullets.`,
    }));
  if (!facts.summary && matched.length) {
    suggestedEdits.push({
      target: 'summary',
      suggestion: `Add a short summary that names your strongest matches: ${matched
        .slice(0, 3)
        .map((m) => m.keyword)
        .join(', ')}.`,
    });
  }

  const warnings: string[] = [];
  if (!facts.experiences.length && !facts.skills.length) {
    warnings.push('Your CV has no experience or skills yet, so the score is not meaningful.');
  }

  return {
    ...base,
    ok: true,
    matchScore,
    strengths: matched.slice(0, 10).map(({ keyword, evidence }) => ({ keyword, evidence })),
    mustHaveGaps: missing
      .filter((k) => k.weight >= 1)
      .slice(0, 10)
      .map((k) => gap(k.keyword)),
    niceToHaveGaps: missing
      .filter((k) => k.weight < 1)
      .slice(0, 10)
      .map((k) => gap(k.keyword)),
    suggestedEdits,
    warnings,
    refusals: [],
  };
}
