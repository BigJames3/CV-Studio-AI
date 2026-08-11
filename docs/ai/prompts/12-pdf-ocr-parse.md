# 12 — PDF OCR Structure Extraction

**promptId:** `pdf_parse_structure`  
**version:** `v1`  
**modelTier:** `M`  
**temperature:** `0.0`  
**upstream:** Textract / Document AI text+blocks

## Task

```
Extract structured resume fields from OCR_TEXT and OCR_BLOCKS.
Assign confidence 0–1 per field based on clarity.
Do not invent missing employers or dates; use null.

Return JSON:
{
  "ok": true,
  "profileFacts": {
    "identity": {},
    "experiences": [],
    "education": [],
    "skills": [],
    "languages": [],
    "certificates": [],
    "projects": []
  },
  "fieldConfidence": {},
  "meanConfidence": 0.0,
  "warnings": ["possible_column_layout", "..."],
  "refusals": []
}
```

## Post-process

If meanConfidence < 0.7 → API error code `OCR_LOW_CONFIDENCE` but still return partial data for UI fix.
