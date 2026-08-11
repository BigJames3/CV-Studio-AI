# 09 — Grammar Checker

**promptId:** `grammar_check`  
**version:** `v1`  
**modelTier:** `S`  
**temperature:** `0.0–0.1`

## Task

```
Proofread TEXT for grammar, spelling, punctuation in locale={{locale}}.
Do NOT change factual meaning, employers, or numbers.
Prefer minimal edits.

Return JSON:
{
  "ok": true,
  "correctedText": "...",
  "edits": [
    { "start": 0, "end": 0, "original": "...", "replacement": "...", "reason": "grammar|spelling|punctuation|clarity" }
  ],
  "warnings": []
}
```

## Fallback

LanguageTool / similar for Free teaser without LLM.
