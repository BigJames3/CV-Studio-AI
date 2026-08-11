# Quality review checklist — Marketplace moderators

**SLA:** first decision ≤ 72h from `submitted`.

## Auto (block submit if fail)

- [ ] Schema `design.json` valid
- [ ] 3 previews + thumbnail
- [ ] Sample PDF renders
- [ ] Malware scan clean
- [ ] Near-dupe hash below threshold
- [ ] Font licence attestation checked

## Human

- [ ] ATS: logical reading order in PDF
- [ ] Visual polish (spacing, alignment, contrast)
- [ ] Not a clone of existing listing / official template
- [ ] Category & tags accurate (no spam keywords)
- [ ] No trademark impersonation in title
- [ ] Sample content is lorem / fictional
- [ ] Price within $4.99–$49.99

## Decision

| Action                | When                                        |
| --------------------- | ------------------------------------------- |
| **Approve**           | All pass → `published`                      |
| **Changes requested** | Fixable issues · comment required           |
| **Reject**            | IP risk, scam, severe quality · reason code |

Reason codes: `ats_fail` · `quality` · `duplicate` · `ip` · `metadata` · `policy`
