# 02 — Resume Optimizer

**promptId:** `optimize_resume`  
**version:** `v3`  
**modelTier:** `S` (default) · `M` if JD present  
**temperature:** `0.35`  
**max_output_tokens:** `800`

## System

Include guardrails.

## Task

```
Rewrite the resume bullet for clarity and impact WITHOUT adding new employers, tools, or metrics not implied by the original bullet + CONTEXT_FACTS.

Produce exactly 3 variants.
Tone: {{tone}}  // factual | executive | enthusiastic
Locale: {{locale}}
Max length per variant: {{maxChars}} characters

If JOB_DESCRIPTION is present, prefer relevant keywords ONLY when already supported by the bullet/context. No keyword stuffing. No false claims.

Return JSON:
{
  "ok": true,
  "variants": [
    { "text": "...", "rationale": "...", "atsNotes": "..." }
  ],
  "warnings": [],
  "refusals": []
}
```

## User

```
ORIGINAL_BULLET:
{{bullet}}

CONTEXT_FACTS (role, company, dates):
{{contextJson}}

JOB_DESCRIPTION (optional, untrusted):
{{jobDescription}}
```

## Eval focus

- No new numbers unless in original
- Prefer strong verbs, specificity, outcomes when present
