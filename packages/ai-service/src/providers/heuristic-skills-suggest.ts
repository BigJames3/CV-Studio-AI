import { cvMentions, extractCvFacts, type CvFacts } from '../cv-facts';
import { SKILL_LEXICON } from '../skills-lexicon';
import type {
  SkillSuggestion,
  SkillsSuggestInput,
  SkillsSuggestResult,
  SkillToDevelop,
} from '../prompts/skills-suggest';
import { SKILLS_SUGGEST_PROMPT_ID, SKILLS_SUGGEST_PROMPT_VERSION } from '../prompts/skills-suggest';

/** Target role families: matched on the role text, then the skills that role usually expects. */
const ROLE_SKILLS: Array<{ match: RegExp; skills: string[] }> = [
  {
    match: /front|react|web|ui\b|int[ée]grat/i,
    skills: ['JavaScript', 'TypeScript', 'React', 'CSS', 'HTML', 'Accessibility', 'Testing'],
  },
  {
    match: /back|api|server|node|java\b|python/i,
    skills: ['SQL', 'REST', 'Docker', 'Testing', 'PostgreSQL', 'Security', 'Microservices'],
  },
  { match: /full.?stack/i, skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git'] },
  {
    match: /devops|sre|cloud|platform|infra/i,
    skills: ['Docker', 'Kubernetes', 'Terraform', 'AWS', 'Linux', 'CI/CD'],
  },
  {
    match: /data|analy|donn[ée]es|bi\b/i,
    skills: ['SQL', 'Python', 'Excel', 'Data Visualization', 'Statistics', 'Power BI'],
  },
  {
    match: /machine learning|\bml\b|\bai\b|ia\b|scien/i,
    skills: ['Python', 'Machine Learning', 'Statistics', 'PyTorch', 'SQL'],
  },
  { match: /mobile|ios|android/i, skills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'Git'] },
  {
    match: /product|produit|\bpm\b|owner/i,
    skills: ['Product Management', 'Roadmapping', 'Agile', 'A/B Testing', 'Stakeholder Management'],
  },
  { match: /design|ux|ui/i, skills: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'] },
  {
    match: /market|growth|seo|content/i,
    skills: ['SEO', 'Google Analytics', 'Content Marketing', 'A/B Testing', 'Copywriting'],
  },
  {
    match: /sales|vente|commercial|account/i,
    skills: ['CRM', 'Negotiation', 'Salesforce', 'Forecasting', 'Communication'],
  },
  {
    match: /project|projet|manager|lead|chef/i,
    skills: ['Project Management', 'Agile', 'Stakeholder Management', 'Leadership', 'Budgeting'],
  },
];

function roleSkills(targetRole: string): string[] {
  if (!targetRole) return [];
  const skills = ROLE_SKILLS.filter((r) => r.match.test(targetRole)).flatMap((r) => r.skills);
  return [...new Set(skills)];
}

/** Where a skill shows up in the CV outside the Skills list. */
function locate(
  facts: CvFacts,
  skill: string
): Pick<SkillSuggestion, 'evidence' | 'source'> | null {
  const hit = (text: string) => mentionsSkill(text, skill);
  for (const exp of facts.experiences) {
    const bullet = exp.bullets.find(hit);
    if (bullet) return { evidence: quote(bullet), source: 'experience' };
    if (hit(exp.title)) return { evidence: quote(exp.title), source: 'experience' };
  }
  const project = facts.projects.find(hit);
  if (project) return { evidence: quote(project), source: 'project' };
  const certificate = facts.certificates.find(hit);
  if (certificate) return { evidence: quote(certificate), source: 'certificate' };
  const education = facts.education.find(hit);
  if (education) return { evidence: quote(education), source: 'education' };
  if (hit(facts.summary) || hit(facts.headline)) {
    return { evidence: quote(facts.summary || facts.headline), source: 'summary' };
  }
  return null;
}

/**
 * One-word skills match case-sensitively so ordinary words are not read as skills
 * ("excel at", "the rest of", "to go"); multi-word skills match in any case.
 */
function mentionsSkill(text: string, skill: string): boolean {
  if (/\s/.test(skill)) return cvMentions(text.toLowerCase(), skill.toLowerCase());
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9+#])${escaped}($|[^A-Za-z0-9+#])`).test(text);
}

function quote(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Evidence-gated skill suggestions: only skills the CV already demonstrates (in a role,
 * project, certificate or summary) but does not list. Skills the target role expects with no
 * evidence go to `toDevelop`, which is advice, never something to add to the CV.
 */
export function skillsSuggestHeuristic(input: SkillsSuggestInput): SkillsSuggestResult {
  const facts = extractCvFacts(input.cvFacts);
  const listed = new Set(facts.skills.map((s) => s.toLowerCase()));
  const targetRole = input.targetRole?.trim() ?? '';
  const expected = roleSkills(targetRole);
  const expectedKeys = new Set(expected.map((s) => s.toLowerCase()));

  const suggestions: SkillSuggestion[] = [];
  for (const skill of SKILL_LEXICON) {
    if (listed.has(skill.toLowerCase())) continue;
    const found = locate(facts, skill);
    if (!found) continue;
    suggestions.push({ skill, ...found, relevantToTarget: expectedKeys.has(skill.toLowerCase()) });
  }
  suggestions.sort((a, b) => Number(b.relevantToTarget) - Number(a.relevantToTarget));

  const toDevelop: SkillToDevelop[] = expected
    .filter((skill) => !listed.has(skill.toLowerCase()) && !cvMentions(facts.text, skill))
    .slice(0, 6)
    .map((skill) => ({
      skill,
      reason: `Often expected for ${targetRole} roles, and your CV shows no sign of it yet.`,
    }));

  const warnings: string[] = [];
  if (targetRole && !expected.length) {
    warnings.push(`No skill profile known for “${targetRole}”: suggestions use your CV only.`);
  }
  if (!suggestions.length) {
    warnings.push('No unlisted skill found in your experience, projects or summary.');
  }

  return {
    ok: true,
    promptId: SKILLS_SUGGEST_PROMPT_ID,
    promptVersion: SKILLS_SUGGEST_PROMPT_VERSION,
    suggestions: suggestions.slice(0, 12),
    toDevelop,
    warnings,
  };
}
