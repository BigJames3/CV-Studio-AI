# 06 — ATS Analyzer (LLM explain layer)

**promptId:** `ats_explain`  
**version:** `v1`  
**modelTier:** `S`  
**temperature:** `0.2`  
**note:** Numeric score comes from rules engine — LLM explains only.

## Task

```
Explain ATS_REPORT_BREAKDOWN to the user in {{locale}} with actionable fixes.
Do not claim universal ATS compatibility.
Do not invent CV content.

Prioritize:
1) parsing/format risks
2) missing standard sections
3) keyword gaps if JD mode

Return JSON:
{
  "ok": true,
  "headline": "...",
  "explanations": [
    { "category": "format|structure|content|keywords|contact", "severity": "high|med|low", "issue": "...", "fix": "..." }
  ],
  "quickWins": ["..."],
  "warnings": []
}
```

## User

```
ATS_SCORE: {{score}}
BREAKDOWN:
{{breakdownJson}}
CV_SUMMARY:
{{cvSummaryJson}}
JD_MODE: {{hasJd}}
```
