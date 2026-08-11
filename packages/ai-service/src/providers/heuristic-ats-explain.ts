import type { AtsExplainInput, AtsExplainResult } from '../prompts/ats-explain';
import {
  ATS_EXPLAIN_PROMPT_ID,
  ATS_EXPLAIN_PROMPT_VERSION,
} from '../prompts/ats-explain';

/**
 * Deterministic ATS explanation layered on the rules score.
 */
export function explainAtsHeuristic(input: AtsExplainInput): AtsExplainResult {
  const score = Number(input.score) || 0;
  const missing = Array.isArray(input.breakdown.missingKeywords)
    ? (input.breakdown.missingKeywords as string[])
    : [];
  const explanations = [];

  if (score < 50) {
    explanations.push({
      category: 'content',
      severity: 'high' as const,
      issue: 'Overall ATS score is below a competitive threshold',
      fix: 'Strengthen section completeness and align wording with the job description',
    });
  }

  if (missing.length) {
    explanations.push({
      category: 'keywords',
      severity: 'high' as const,
      issue: `Missing keywords: ${missing.slice(0, 8).join(', ')}`,
      fix: 'Add only keywords you can honestly support with experience or skills',
    });
  } else if (input.hasJd) {
    explanations.push({
      category: 'keywords',
      severity: 'low' as const,
      issue: 'Keyword overlap with the job description looks reasonable',
      fix: 'Keep terminology consistent with the JD where accurate',
    });
  }

  explanations.push({
    category: 'structure',
    severity: 'med' as const,
    issue: 'ATS parsers prefer clear standard section headings',
    fix: 'Use Experience, Education, Skills, and Contact labels',
  });

  const quickWins = [
    'Use standard section headings',
    missing[0] ? `Consider adding supported mention of “${missing[0]}”` : 'Quantify 1–2 achievements with metrics you can verify',
    'Export PDF with selectable text (avoid image-only CVs)',
  ];

  return {
    ok: true,
    promptId: ATS_EXPLAIN_PROMPT_ID,
    promptVersion: ATS_EXPLAIN_PROMPT_VERSION,
    headline:
      score >= 75
        ? 'Solid ATS foundation — refine keywords for a stronger match'
        : score >= 50
          ? 'Moderate ATS readiness — prioritize keyword and structure fixes'
          : 'Low ATS readiness — address structure and keyword gaps first',
    explanations,
    quickWins,
    warnings: ['Numeric score comes from rules engine; this layer explains only'],
  };
}
