import type { PdfCvContent } from './pdf-content.types';

/**
 * Accepts flat editor content or legacy `{ sections: {...} }` / personalInfo shapes.
 */
export function normalizeCvContent(raw: unknown): PdfCvContent {
  if (!raw || typeof raw !== 'object') {
    return emptyContent();
  }

  const root = raw as Record<string, unknown>;
  const sections =
    root.sections && typeof root.sections === 'object'
      ? (root.sections as Record<string, unknown>)
      : root;

  if (sections.personalInfo && typeof sections.personalInfo === 'object') {
    const pi = sections.personalInfo as Record<string, unknown>;
    const first = String(pi.firstName ?? '');
    const last = String(pi.lastName ?? '');
    return {
      schemaVersion: Number(root.schemaVersion ?? 1),
      identity: {
        fullName: [first, last].filter(Boolean).join(' ') || String(pi.fullName ?? ''),
        headline: asString(pi.headline ?? pi.title),
        email: asString(pi.email),
        phone: asString(pi.phone),
        city: asString(pi.city ?? pi.location),
        linkedin: asString(pi.linkedin),
        github: asString(pi.github),
        website: asString(pi.website),
        photoUrl: asString(pi.photoUrl) ?? null,
      },
      summary: { text: asString((sections.summary as { text?: string })?.text) ?? '' },
      experiences: asArray(sections.experiences).map(mapExperience),
      education: asArray(sections.education).map(mapEducation),
      skills: asArray(sections.skills).map(mapSkill),
      languages: asArray(sections.languages).map(mapLanguage),
      projects: asArray(sections.projects).map(mapProject),
      certificates: asArray(sections.certificates).map(mapCertificate),
      customization: (sections.customization ?? root.customization) as PdfCvContent['customization'],
      templateKey: asString(root.templateKey ?? sections.templateKey),
    };
  }

  const identity = (sections.identity ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: Number(root.schemaVersion ?? 1),
    templateKey: asString(root.templateKey ?? sections.templateKey),
    identity: {
      fullName: String(identity.fullName ?? ''),
      headline: asString(identity.headline),
      email: asString(identity.email),
      phone: asString(identity.phone),
      city: asString(identity.city),
      linkedin: asString(identity.linkedin),
      github: asString(identity.github),
      website: asString(identity.website),
      photoUrl: (identity.photoUrl as string | null | undefined) ?? null,
    },
    summary: {
      text:
        typeof sections.summary === 'string'
          ? sections.summary
          : String((sections.summary as { text?: string } | undefined)?.text ?? ''),
    },
    experiences: asArray(sections.experiences).map(mapExperience),
    education: asArray(sections.education).map(mapEducation),
    skills: asArray(sections.skills).map(mapSkill),
    languages: asArray(sections.languages).map(mapLanguage),
    projects: asArray(sections.projects).map(mapProject),
    certificates: asArray(sections.certificates).map(mapCertificate),
    customization: (sections.customization ?? root.customization) as PdfCvContent['customization'],
  };
}

function emptyContent(): PdfCvContent {
  return {
    identity: { fullName: '' },
    summary: { text: '' },
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certificates: [],
  };
}

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function mapExperience(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    company: String(e.company ?? ''),
    title: String(e.title ?? e.position ?? ''),
    location: asString(e.location),
    start: asString(e.start ?? e.startDate),
    end: (e.end ?? e.endDate) as string | null | undefined,
    current: Boolean(e.current),
    bullets: Array.isArray(e.bullets) ? e.bullets.map(String) : undefined,
    description: asString(e.description),
  };
}

function mapEducation(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    school: String(e.school ?? ''),
    degree: String(e.degree ?? ''),
    field: asString(e.field ?? e.fieldOfStudy),
    start: asString(e.start ?? e.startDate),
    end: asString(e.end ?? e.endDate),
    details: asString(e.details),
  };
}

function mapSkill(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    name: String(e.name ?? ''),
    level: e.level as number | string | undefined,
  };
}

function mapLanguage(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    name: String(e.name ?? e.language ?? ''),
    level: asString(e.level ?? e.proficiency),
  };
}

function mapProject(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    name: String(e.name ?? e.title ?? ''),
    description: asString(e.description),
    url: asString(e.url),
  };
}

function mapCertificate(e: Record<string, unknown>) {
  return {
    id: asString(e.id),
    name: String(e.name ?? ''),
    issuer: asString(e.issuer),
    year: asString(e.year ?? e.issueDate),
  };
}
