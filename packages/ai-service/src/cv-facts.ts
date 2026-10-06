/**
 * Read-only view of a CV's JSON content (CvContent) used by the heuristic AI features.
 * Everything the features say about the candidate must come from these facts.
 */
export type CvFactExperience = { title: string; company: string; bullets: string[] };

export type CvFacts = {
  fullName: string;
  headline: string;
  summary: string;
  experiences: CvFactExperience[];
  skills: string[];
  projects: string[];
  certificates: string[];
  education: string[];
  /** Lower-cased text of the whole CV, for keyword evidence checks. */
  text: string;
};

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')
    : [];
}

function names(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : str((v as { name?: unknown })?.name)))
    .filter(Boolean);
}

export function extractCvFacts(content: Record<string, unknown> | null | undefined): CvFacts {
  const cv = content ?? {};
  const identity = (cv.identity ?? cv.personal ?? {}) as Record<string, unknown>;
  const summary = cv.summary as { text?: unknown } | string | undefined;

  // CvContent uses `experiences`; older payloads used `experience`.
  const experiences = list(cv.experiences ?? cv.experience).map((row) => ({
    title: str(row.title) || str(row.position),
    company: str(row.company),
    bullets: Array.isArray(row.bullets) ? row.bullets.map(str).filter(Boolean) : [],
  }));

  const projects = list(cv.projects)
    .map((p) => [str(p.name), str(p.description)].filter(Boolean).join(': '))
    .filter(Boolean);
  const certificates = list(cv.certificates)
    .map((c) => [str(c.name), str(c.issuer)].filter(Boolean).join(', '))
    .filter(Boolean);
  const education = list(cv.education)
    .map((e) => [str(e.degree), str(e.field), str(e.school)].filter(Boolean).join(', '))
    .filter(Boolean);

  const facts: Omit<CvFacts, 'text'> = {
    fullName:
      str(identity.fullName) ||
      [str(identity.firstName), str(identity.lastName)].filter(Boolean).join(' '),
    headline: str(identity.headline),
    summary: typeof summary === 'string' ? summary.trim() : str(summary?.text),
    experiences,
    skills: names(cv.skills),
    projects,
    certificates,
    education,
  };

  const text = [
    facts.headline,
    facts.summary,
    ...experiences.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...facts.skills,
    ...projects,
    ...certificates,
    ...education,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return { ...facts, text };
}

const STOPWORDS = new Set(
  (
    'about above after again against also among another based being below between both ' +
    'could does doing during each either every from further have having here into itself ' +
    'just like made make many more most much must need needs only other over same should ' +
    'some such than that their them then there these they this those through under until ' +
    'upon very want well were what when where which while will with within without would ' +
    'your yours able ability strong good great excellent plus role team teams work working ' +
    'years year experience experienced knowledge skills skill including include etc job ' +
    'candidate candidates company position looking join responsibilities requirements ' +
    'required preferred nice using used use across ensure help within ' +
    'avec pour dans des les une sont vous nous votre notre leur leurs plus être avoir ' +
    'cette ces sur par pas qui que est aux ans poste équipe entreprise profil ' +
    'expérience compétences connaissance connaissances maîtrise requis souhaité ' +
    // Seniority, job-title and generic verbs: they describe the role, not a skill to match.
    'senior junior lead principal staff head chief intern internship engineer engineers ' +
    'engineering developer developers development développeur développeuse ingénieur ' +
    'manager managers build building builds create creating develop developing deliver ' +
    'delivering maintain maintaining system systems solution solutions'
  ).split(/\s+/)
);

/** Short tokens kept as keywords because they are common tech or business acronyms. */
const KNOWN_SHORT = new Set([
  'sql',
  'aws',
  'gcp',
  'api',
  'css',
  'php',
  'ios',
  'ux',
  'ui',
  'ai',
  'ml',
  'qa',
  'seo',
  'crm',
  'erp',
  'sap',
  'go',
  'c++',
  'c#',
  'bi',
  'etl',
  'k8s',
  'vue',
  'git',
  'tdd',
]);

const TOKEN = /[a-z0-9àâäçéèêëîïôöùûüÿœ][a-z0-9àâäçéèêëîïôöùûüÿœ+#.\-/]*/gi;

/** Distinct keywords of a text, in order of first appearance, without stopwords. */
export function extractKeywords(text: string, max = 40): string[] {
  const seen = new Set<string>();
  for (const raw of text.toLowerCase().match(TOKEN) ?? []) {
    const token = raw.replace(/[.\-/]+$/, '');
    if (token.length < 4 && !KNOWN_SHORT.has(token)) continue;
    if (STOPWORDS.has(token) || /^\d+$/.test(token)) continue;
    seen.add(token);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** True when the term appears in the CV text as a whole word. */
export function cvMentions(cvText: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, 'i').test(cvText);
}
