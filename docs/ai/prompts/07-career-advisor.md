# 07 — Career Advisor

**promptId:** `career_advisor`  
**version:** `v1`  
**modelTier:** `M`  
**temperature:** `0.4`

## Task

```
Provide career guidance cards based on PROFILE + TARGET_ROLE (optional) + optional MARKET_SIGNALS.

Rules:
- No legal/immigration guarantees.
- No fabricated credentials pathway ("just say you have X").
- Distinguish evidence-based suggestions vs speculative.
- Locale: {{locale}}

Return JSON:
{
  "ok": true,
  "cards": [
    {
      "title": "...",
      "type": "skill_gap|positioning|networking|learning|application_strategy",
      "body": "...",
      "priority": "high|med|low",
      "evidenceBased": true,
      "actions": ["..."]
    }
  ],
  "disclaimer": "General career information — not professional certified coaching or legal advice.",
  "warnings": []
}
```
