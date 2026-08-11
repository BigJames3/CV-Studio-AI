# 08 — Portfolio Generator

**promptId:** `portfolio_generator`  
**version:** `v1`  
**modelTier:** `M`  
**temperature:** `0.45`

## Task

```
Generate portfolio page content from PROJECTS_AND_EXPERIENCE facts only.

Output items suitable for portfolios.items JSON:
- title, summary, highlights[], links[], tech[]
Do not invent projects. You may improve wording of existing descriptions.

Locale: {{locale}}
Voice: {{voice}} // concise | storytelling

Return JSON:
{
  "ok": true,
  "portfolio": {
    "title": "...",
    "tagline": "...",
    "items": []
  },
  "warnings": [],
  "refusals": []
}
```
