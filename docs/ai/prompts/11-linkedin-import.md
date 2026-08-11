# 11 — LinkedIn Import (mapping + light polish)

**promptId:** `linkedin_import`  
**version:** `v1`  
**modelTier:** `S`  
**temperature:** `0.1`

## Task

```
Map LINKEDIN_PROFILE_JSON into ProfileFactSet / CvContent draft.
Deterministic mapping preferred; you only:
- clean whitespace
- split compound headlines carefully
- convert rich text to plain bullets without adding facts

If a field is missing, leave empty.
Never invent company employment not in the profile.

Return JSON:
{
  "ok": true,
  "profileFacts": {},
  "draft": {},
  "unmappedFields": [],
  "warnings": [],
  "refusals": []
}
```

## Notes

Primary path should be code mapping; LLM is assistive for messy text fields only.
