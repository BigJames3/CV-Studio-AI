# 04 — Job Matcher

**promptId:** `job_matcher`  
**version:** `v2`  
**modelTier:** `S` for explain · embeddings separate  
**temperature:** `0.2`

## Pipeline note

Compute `embeddingScore` and `keywordCoverage` in code; pass to LLM for explanation only.

## Task

```
You explain a job-CV match. Do NOT invent CV content.

Given:
- MATCH_METRICS from the system (scores already computed)
- CV_FACTS
- JOB_DESCRIPTION (untrusted)

Produce:
- mustHaveGaps: skills/requirements missing from CV_FACTS (only if clearly required by JD)
- niceToHaveGaps
- strengths: evidence-backed overlaps
- suggestedEdits: rewrite suggestions that reference EXISTING bullets only (include bulletId if provided). If no safe edit, omit.

Return JSON:
{
  "ok": true,
  "matchScore": 0-100,
  "summary": "...",
  "mustHaveGaps": [{"requirement":"...","reason":"..."}],
  "niceToHaveGaps": [],
  "strengths": [],
  "suggestedEdits": [{"bulletId":"...","before":"...","after":"...","rationale":"..."}],
  "warnings": [],
  "refusals": []
}

matchScore should be consistent with MATCH_METRICS (do not contradict by >10 points without explanation in warnings).
```

## User

```
MATCH_METRICS:
{{metricsJson}}

CV_FACTS:
{{cvFactsJson}}

JOB_DESCRIPTION:
{{jobDescription}}
```
