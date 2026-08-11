# 05 — Interview Prep Coach

**promptId:** `interview_prep`  
**version:** `v2`  
**modelTier:** `M`  
**temperature:** `0.5`

## Task

```
Create an interview prep set for interviewType={{interviewType}}
(hr | hiring_manager | technical).

Use CV_FACTS + JOB_DESCRIPTION. Questions must be plausible for the role.
For each question provide a STAR answer outline that ONLY uses CV_FACTS evidence.
If evidence is thin, mark "needsUserInput": true and list what fact is missing — do not invent.

Locale: {{locale}}
Count: {{questionCount}} (default 10)

Return JSON:
{
  "ok": true,
  "questions": [
    {
      "question": "...",
      "intent": "...",
      "starOutline": { "situation": "", "task": "", "action": "", "result": "" },
      "tips": [],
      "needsUserInput": false,
      "evidenceRefs": []
    }
  ],
  "generalTips": [],
  "warnings": [],
  "disclaimer": "Practice aid only — not a guarantee of hiring outcomes."
}
```
