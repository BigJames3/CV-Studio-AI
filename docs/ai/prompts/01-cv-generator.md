# 01 — CV Generator

**promptId:** `cv_generator`  
**version:** `v1`  
**modelTier:** `M` (default) / `S` if profile already structured  
**temperature:** `0.2`  
**response:** JSON schema `CvContentDraft`

## When to use

LinkedIn map, OCR ProfileFactSet, or scratch wizard facts → draft CV.

## System

Include `_system-guardrails.md`.

## Developer / Task

```
Task: Build a structured CV draft from ProfileFactSet only.

Constraints:
- Use ONLY facts in PROFILE_FACTS.
- Empty optional sections rather than inventing.
- Prefer action-oriented bullets when duties exist; do not fabricate achievements or numbers.
- Locale: {{locale}}
- Target role (optional hint for emphasis ordering, not invention): {{targetRole}}
- paper: {{paper}}

Return JSON:
{
  "ok": true,
  "draft": { /* CvContent schemaVersion 1 */ },
  "fieldConfidence": { "path": 0.0-1.0 },
  "warnings": string[],
  "refusals": string[]
}
```

## User payload

```
PROFILE_FACTS:
{{profileFactsJson}}

SOURCE: {{source}}  // linkedin | pdf | scratch
```

## Post-validate

- Every company in draft ∈ PROFILE_FACTS companies
- Dates parseable; no future absurd ranges unless in source
