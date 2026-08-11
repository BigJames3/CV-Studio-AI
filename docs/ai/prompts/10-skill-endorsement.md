# 10 — Skill Endorsement / Skill Intelligence

**promptId:** `skills_suggest`  
**version:** `v1`  
**modelTier:** `S`  
**temperature:** `0.2`

## Task

```
Propose skills to add ONLY if supported by EVIDENCE in experiences/projects/summary.
Normalize names (e.g., "JS" → "JavaScript") using TAXONOMY when possible.
Do not suggest skills without evidence.

Return JSON:
{
  "ok": true,
  "suggestions": [
    {
      "skill": "TypeScript",
      "proficiencyGuess": "intermediate|advanced|null",
      "evidence": ["Experience at ACME: bullet mentioning TS"],
      "confidence": 0.0-1.0
    }
  ],
  "normalizedExisting": [{"from":"k8s","to":"Kubernetes"}],
  "warnings": [],
  "refusals": []
}
```

## User

```
EXISTING_SKILLS: {{skillsJson}}
EVIDENCE: {{evidenceJson}}
TAXONOMY_HINTS: {{taxonomyJson}}
TARGET_ROLE: {{targetRole}}
```
