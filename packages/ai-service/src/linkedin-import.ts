import type { CvContent } from '@cvstudio/shared-types';

/**
 * Deterministic import of LinkedIn's official data export ("Get a copy of your data").
 * The export is a ZIP of CSV files; the client sends each file's text by file name.
 * Nothing is generated: every field comes from the export, or from the account identity.
 */

export type LinkedInImportInput = {
  /** CSV text by file name, e.g. { "Positions.csv": "Company Name,Title,…" }. */
  files: Record<string, string>;
  /** Identity already known from the account (LinkedIn sign-in fills it). */
  fallbackIdentity?: { fullName?: string; email?: string; photoUrl?: string | null };
};

export type LinkedInImportStats = {
  experiences: number;
  education: number;
  skills: number;
  languages: number;
  certificates: number;
  projects: number;
};

export type LinkedInImportResult = {
  ok: boolean;
  content: CvContent;
  stats: LinkedInImportStats;
  recognizedFiles: string[];
  warnings: string[];
  refusals: string[];
};

type Row = Record<string, string>;

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const rows = records.filter((r) => r.some((cell) => cell.trim()));
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  return rows.map((cells) =>
    Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? '').trim()]))
  );
}

/** Rows of an export file, matched on its base name in any case ("…/Positions.csv"). */
function rowsOf(files: Record<string, Row[]>, name: string): Row[] {
  return files[name.toLowerCase()] ?? [];
}

function col(row: Row, ...names: string[]): string {
  for (const name of names) {
    const value = row[name.toLowerCase()];
    if (value) return value;
  }
  return '';
}

/** Split a LinkedIn description into bullets: one per line or "•", leading marks removed. */
function bullets(description: string): string[] {
  return description
    .split(/\r?\n|•/)
    .map((line) => line.replace(/^\s*[-*–]\s+/, '').trim())
    .filter(Boolean);
}

function yearOf(value: string): string | undefined {
  return value.match(/\d{4}/)?.[0];
}

/** Websites look like "[PERSONAL:https://a.dev,COMPANY:https://b.com]". */
function firstWebsite(value: string): string | undefined {
  return value.match(/https?:\/\/[^,\]\s]+/)?.[0];
}

const KNOWN_FILES = [
  'profile.csv',
  'positions.csv',
  'education.csv',
  'skills.csv',
  'languages.csv',
  'certifications.csv',
  'projects.csv',
  'email addresses.csv',
  'phonenumbers.csv',
];

export function importLinkedInExport(input: LinkedInImportInput): LinkedInImportResult {
  const parsed: Record<string, Row[]> = {};
  const ignored: string[] = [];
  for (const [path, text] of Object.entries(input.files ?? {})) {
    const base = path.split(/[\\/]/).pop()?.toLowerCase() ?? '';
    if (KNOWN_FILES.includes(base) && typeof text === 'string') parsed[base] = parseCsv(text);
    else ignored.push(path);
  }

  const profile = rowsOf(parsed, 'Profile.csv')[0] ?? {};
  const emails = rowsOf(parsed, 'Email Addresses.csv');
  const primaryEmail =
    emails.find((r) => /yes|true/i.test(col(r, 'Primary'))) ?? emails.find(Boolean);
  const phone = rowsOf(parsed, 'PhoneNumbers.csv')[0];
  const fallback = input.fallbackIdentity ?? {};

  const content: CvContent = {
    schemaVersion: 1,
    identity: {
      fullName:
        [col(profile, 'First Name'), col(profile, 'Last Name')].filter(Boolean).join(' ') ||
        fallback.fullName ||
        '',
      headline: col(profile, 'Headline') || undefined,
      email: (primaryEmail && col(primaryEmail, 'Email Address')) || fallback.email || undefined,
      phone: (phone && col(phone, 'Number')) || undefined,
      city: col(profile, 'Geo Location', 'Location') || undefined,
      website: firstWebsite(col(profile, 'Websites')),
      photoUrl: fallback.photoUrl ?? null,
    },
    summary: { text: col(profile, 'Summary') },
    experiences: rowsOf(parsed, 'Positions.csv').map((row, i) => {
      const end = col(row, 'Finished On');
      return {
        id: `li-exp-${i + 1}`,
        company: col(row, 'Company Name'),
        title: col(row, 'Title'),
        location: col(row, 'Location') || undefined,
        start: col(row, 'Started On'),
        end: end || null,
        current: !end,
        bullets: bullets(col(row, 'Description')),
      };
    }),
    education: rowsOf(parsed, 'Education.csv').map((row, i) => ({
      id: `li-edu-${i + 1}`,
      school: col(row, 'School Name'),
      degree: col(row, 'Degree Name'),
      start: col(row, 'Start Date') || undefined,
      end: col(row, 'End Date') || undefined,
      details: col(row, 'Notes', 'Activities') || undefined,
    })),
    skills: rowsOf(parsed, 'Skills.csv')
      .map((row) => col(row, 'Name'))
      .filter(Boolean)
      .map((name, i) => ({ id: `li-skill-${i + 1}`, name })),
    languages: rowsOf(parsed, 'Languages.csv')
      .filter((row) => col(row, 'Name'))
      .map((row, i) => ({
        id: `li-lang-${i + 1}`,
        name: col(row, 'Name'),
        level: col(row, 'Proficiency') || undefined,
      })),
    projects: rowsOf(parsed, 'Projects.csv')
      .filter((row) => col(row, 'Title'))
      .map((row, i) => ({
        id: `li-proj-${i + 1}`,
        name: col(row, 'Title'),
        description: col(row, 'Description') || undefined,
        url: col(row, 'Url') || undefined,
      })),
    certificates: rowsOf(parsed, 'Certifications.csv')
      .filter((row) => col(row, 'Name'))
      .map((row, i) => ({
        id: `li-cert-${i + 1}`,
        name: col(row, 'Name'),
        issuer: col(row, 'Authority') || undefined,
        year: yearOf(col(row, 'Started On')),
      })),
  };

  const stats: LinkedInImportStats = {
    experiences: content.experiences.length,
    education: content.education.length,
    skills: content.skills.length,
    languages: content.languages.length,
    certificates: content.certificates.length,
    projects: content.projects.length,
  };
  const recognizedFiles = Object.keys(parsed);
  const warnings: string[] = [];
  if (ignored.length) warnings.push(`Ignored ${ignored.length} file(s) not used for a CV`);
  if (!content.identity.fullName) warnings.push('No name found: add it in the editor');

  const imported = Object.values(stats).some((n) => n > 0) || Boolean(profile['first name']);
  return {
    ok: imported,
    content,
    stats,
    recognizedFiles,
    warnings,
    refusals: imported
      ? []
      : ['No LinkedIn export data found (expected Profile.csv, Positions.csv, Education.csv…)'],
  };
}
