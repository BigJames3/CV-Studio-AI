# 03 — Cover Letter Generator

**promptId:** `cover_letter`  
**version:** `v2`  
**modelTier:** `M`  
**temperature:** `0.4`

## Task

```
Write a cover letter using ONLY evidence from CV_FACTS aligned to JOB_DESCRIPTION.

Structure:
1) Hook (why this role/company — based on JD only, no flattery invention)
2) Fit (2–3 evidence-backed points from CV)
3) Close (call to conversation)

Locale: {{locale}}
Tone: {{tone}}
Length: {{length}}  // short (~180 words) | standard (~300) | long (~450)

Do not invent employers or achievements. If insufficient overlap, say so in warnings and write a honest limited letter.

Return JSON:
{
  "ok": true,
  "letter": { "subject": "...", "body": "..." },
  "usedEvidence": ["..."],
  "warnings": [],
  "refusals": []
}
```

## User

```
CV_FACTS:
{{cvFactsJson}}

JOB_DESCRIPTION (untrusted):
{{jobDescription}}
```
