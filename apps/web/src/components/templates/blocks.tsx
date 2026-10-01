import type { CSSProperties, ReactNode } from 'react';
import type { CvContent, TemplateCustomization } from '@/lib/templates/types';

/**
 * Building blocks shared by the second generation of templates (Classique, Bandeau, ...).
 * French labels, French dates, and every block renders nothing when its data is empty or the
 * customization hides it, so a CV only shows the sections the candidate actually filled in.
 */

export const LABELS = {
  profile: 'Profil professionnel',
  experience: 'Expérience professionnelle',
  skills: 'Compétences',
  education: 'Formation',
  certifications: 'Certifications',
  languages: 'Langues',
  projects: 'Projets',
  references: 'Références',
  contact: 'Coordonnées',
  awards: 'Prix et distinctions',
  volunteering: 'Bénévolat et engagements',
  publications: 'Publications',
  talks: 'Conférences et interventions',
  licenses: 'Permis et habilitations',
  interests: 'Centres d’intérêt',
  additional: 'Informations complémentaires',
} as const;

/** Non-empty trimmed lines, e.g. responsibilities typed one per line. */
function lines(values?: string[]): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export function joinParts(parts: Array<string | undefined | null>, separator = ' · ') {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(separator);
}

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/**
 * `2024-03`, `2024/03`, `03/2024` or `03-2024` become `Mars 2024`. Anything else (a year, a
 * month already written out) is shown as typed: a missing month is never made up.
 */
export function formatDateFr(value?: string | null): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '';
  let m = /^(\d{4})[-/.](\d{1,2})$/.exec(raw);
  if (m) return monthYear(Number(m[2]), m[1]) ?? raw;
  m = /^(\d{1,2})[-/.](\d{4})$/.exec(raw);
  if (m) return monthYear(Number(m[1]), m[2]) ?? raw;
  return raw;
}

function monthYear(month: number, year: string) {
  return month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${year}` : null;
}

/** `Mars 2024 – Aujourd'hui`, `2020 – 2024`, or a single date when only one is known. */
export function formatPeriod(start?: string | null, end?: string | null, current?: boolean) {
  const from = formatDateFr(start);
  const to = current ? 'Aujourd’hui' : formatDateFr(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/** Skill level 1–5 as words; no level means no label. */
export function skillLevelLabel(level?: number): string {
  if (!level) return '';
  if (level <= 2) return 'Débutant';
  if (level === 3) return 'Intermédiaire';
  if (level === 4) return 'Avancé';
  return 'Expert';
}

export type ContactItem = { kind: 'email' | 'phone' | 'city' | 'link'; value: string };

export function contactItems(identity: CvContent['identity']): ContactItem[] {
  const strip = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const location = locationOf(identity);
  const items: Array<ContactItem | null> = [
    identity.phone ? { kind: 'phone', value: identity.phone } : null,
    identity.email ? { kind: 'email', value: identity.email } : null,
    location ? { kind: 'city', value: location } : null,
    identity.linkedin ? { kind: 'link', value: strip(identity.linkedin) } : null,
    identity.github ? { kind: 'link', value: strip(identity.github) } : null,
    identity.website ? { kind: 'link', value: strip(identity.website) } : null,
  ];
  return items.filter((i): i is ContactItem => i !== null);
}

const ICON_PATHS: Record<ContactItem['kind'], string> = {
  email: 'M3 5h18v14H3z M3 6l9 7 9-7',
  phone:
    'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  city: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
};

/** Inline SVG so icons survive the HTML → PDF export without an icon font. */
export function ContactIcon({
  kind,
  color,
  size = 11,
}: {
  kind: ContactItem['kind'];
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d={ICON_PATHS[kind]} />
    </svg>
  );
}

export type HeadingVariant = 'rule' | 'bar' | 'caps' | 'serif' | 'pill' | 'code';

export type Theme = {
  primary: string;
  accent: string;
  text: string;
  muted: string;
  headerFont: string;
  bodyFont: string;
  heading: HeadingVariant;
  /** Section titles in a narrow left column next to the content (Minimal layout). */
  sideLabels?: boolean;
};

export function themeFrom(
  c: TemplateCustomization,
  heading: HeadingVariant,
  muted = '#6b7280'
): Theme {
  return {
    primary: c.primaryColor,
    accent: c.accentColor,
    text: c.textColor,
    muted,
    headerFont: c.headerFont,
    bodyFont: c.bodyFont,
    heading,
  };
}

export function Heading({ theme, children }: { theme: Theme; children: ReactNode }) {
  const base: CSSProperties = {
    margin: '0 0 0.6rem',
    fontFamily: theme.headerFont,
    fontWeight: 700,
    color: theme.primary,
  };
  switch (theme.heading) {
    case 'bar':
      return (
        <h2
          style={{
            ...base,
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderLeft: `4px solid ${theme.accent}`,
            paddingLeft: 8,
          }}
        >
          {children}
        </h2>
      );
    case 'caps':
      return (
        <h2
          style={{
            ...base,
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {children}
        </h2>
      );
    case 'serif':
      return (
        <h2
          style={{
            ...base,
            fontSize: '0.95rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {children}
          <span style={{ flex: 1, height: 1, background: theme.accent }} />
        </h2>
      );
    case 'pill':
      return (
        <h2
          style={{
            ...base,
            display: 'inline-block',
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: theme.primary,
            borderRadius: 999,
            padding: '3px 12px',
          }}
        >
          {children}
        </h2>
      );
    case 'code':
      return (
        <h2
          style={{ ...base, fontSize: '0.85rem', fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          <span style={{ color: theme.accent }}>## </span>
          {children}
        </h2>
      );
    case 'rule':
    default:
      return (
        <h2
          style={{
            ...base,
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderBottom: `1.5px solid ${theme.primary}`,
            paddingBottom: 4,
          }}
        >
          {children}
        </h2>
      );
  }
}

export function Section({
  theme,
  title,
  children,
  style,
}: {
  theme: Theme;
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  if (theme.sideLabels) {
    return (
      <section
        style={{
          marginTop: 'var(--cv-section-gap)',
          display: 'grid',
          gridTemplateColumns: '24% 1fr',
          columnGap: 18,
          ...style,
        }}
      >
        <Heading theme={theme}>{title}</Heading>
        <div>{children}</div>
      </section>
    );
  }
  return (
    <section style={{ marginTop: 'var(--cv-section-gap)', breakInside: 'avoid-page', ...style }}>
      <Heading theme={theme}>{title}</Heading>
      {children}
    </section>
  );
}

export type SectionName =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'projects'
  | 'references'
  | 'awards'
  | 'volunteering'
  | 'publications'
  | 'talks'
  | 'licenses'
  | 'interests'
  | 'additional';

/** Same visibility rules as the blocks below: lets a layout drop an empty column. */
export function hasSection(data: CvContent, c: TemplateCustomization, name: SectionName): boolean {
  switch (name) {
    case 'summary':
      return Boolean(c.showSummary && data.summary.text.trim());
    case 'experience':
      return Boolean(c.showExperience && data.experiences.length > 0);
    case 'education':
      return Boolean(c.showEducation && data.education.length > 0);
    case 'skills':
      return Boolean(c.showSkills && data.skills.some((s) => s.name.trim()));
    case 'languages':
      return data.languages.some((l) => l.name.trim());
    case 'certifications':
      return Boolean(c.showCertificates && data.certificates.some((x) => x.name.trim()));
    case 'projects':
      return Boolean(c.showProjects && data.projects.some((p) => p.name.trim()));
    case 'references':
      return Boolean(c.showReferences && (data.references ?? []).some((r) => r.name.trim()));
    case 'awards':
      return (data.awards ?? []).some((a) => a.name.trim());
    case 'volunteering':
      return (data.volunteering ?? []).some((v) => v.organization.trim() || v.role?.trim());
    case 'publications':
      return (data.publications ?? []).some((p) => p.title.trim());
    case 'talks':
      return (data.talks ?? []).some((t) => t.event.trim() || t.topic?.trim());
    case 'licenses':
      return (data.licenses ?? []).some((l) => l.name.trim());
    case 'interests':
      return (data.interests ?? []).some((i) => i.name.trim());
    case 'additional': {
      const x = data.extras ?? {};
      return Boolean(
        x.availability?.trim() ||
        x.notice?.trim() ||
        x.desiredLocation?.trim() ||
        (x.mobility ?? []).length > 0 ||
        (data.additionalInfo ?? []).some((i) => i.label.trim() || i.value.trim())
      );
    }
  }
}

export function SummaryBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'summary')) return null;
  return (
    <Section theme={theme} title={LABELS.profile}>
      <p style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{data.summary.text}</p>
    </Section>
  );
}

type BlockProps = { data: CvContent; c: TemplateCustomization; theme: Theme };

export function ExperienceBlock({
  data,
  c,
  theme,
  variant = 'default',
}: BlockProps & { variant?: 'default' | 'timeline' | 'compact' }) {
  if (!hasSection(data, c, 'experience')) return null;
  return (
    <Section theme={theme} title={LABELS.experience}>
      <div
        style={
          variant === 'timeline'
            ? { borderLeft: `2px solid ${theme.accent}`, marginLeft: 5, paddingLeft: 16 }
            : undefined
        }
      >
        {data.experiences.map((exp, i) => {
          const period = formatPeriod(exp.start, exp.end, exp.current);
          const place = joinParts([exp.company, exp.location, exp.contractType, exp.sector]);
          const achievements = lines(exp.achievements);
          return (
            <article
              key={exp.id}
              style={{
                position: 'relative',
                marginTop: i === 0 ? 0 : variant === 'compact' ? 8 : 14,
                breakInside: 'avoid',
              }}
            >
              {variant === 'timeline' ? (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: -23,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: exp.current ? theme.accent : '#ffffff',
                    border: `2px solid ${theme.accent}`,
                  }}
                />
              ) : null}
              {variant === 'timeline' && period ? (
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: theme.accent }}>
                  {period}
                </p>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ fontFamily: theme.headerFont, fontSize: '0.92rem' }}>
                  {exp.title}
                </strong>
                {variant !== 'timeline' && period ? (
                  <span style={{ fontSize: '0.75rem', color: theme.muted, whiteSpace: 'nowrap' }}>
                    {period}
                  </span>
                ) : null}
              </div>
              {place ? (
                <p style={{ margin: '1px 0 4px', fontSize: '0.8rem', color: theme.primary }}>
                  {place}
                </p>
              ) : null}
              {exp.bullets.filter((b) => b.trim()).length > 0 ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.1rem',
                    fontSize: '0.8rem',
                    listStyle: 'disc',
                  }}
                >
                  {exp.bullets
                    .filter((b) => b.trim())
                    .map((b, j) => (
                      <li key={j} style={{ marginTop: 2 }}>
                        {b}
                      </li>
                    ))}
                </ul>
              ) : null}
              {achievements.length > 0 ? (
                <>
                  <p style={{ margin: '4px 0 0', fontSize: '0.76rem', fontWeight: 600 }}>
                    Réalisations
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.1rem',
                      fontSize: '0.8rem',
                      listStyle: 'disc',
                    }}
                  >
                    {achievements.map((a, j) => (
                      <li key={j} style={{ marginTop: 2 }}>
                        {a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {exp.tools?.trim() ? (
                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: theme.muted }}>
                  Outils : {exp.tools.trim()}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </Section>
  );
}

export function EducationBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'education')) return null;
  return (
    <Section theme={theme} title={LABELS.education}>
      {data.education.map((ed, i) => {
        const period = formatPeriod(ed.start, ed.end);
        const diploma = [ed.degree, ed.field].filter(Boolean).join(' – ');
        return (
          <div key={ed.id} style={{ marginTop: i === 0 ? 0 : 10, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontFamily: theme.headerFont, fontSize: '0.88rem' }}>
                {diploma || ed.school}
              </strong>
              {period ? (
                <span style={{ fontSize: '0.75rem', color: theme.muted, whiteSpace: 'nowrap' }}>
                  {period}
                </span>
              ) : null}
            </div>
            {diploma && (ed.school || ed.location) ? (
              <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: theme.primary }}>
                {joinParts([ed.school, ed.location])}
              </p>
            ) : null}
            {ed.honors?.trim() || ed.thesis?.trim() ? (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: theme.muted }}>
                {joinParts([
                  ed.honors?.trim() ? `Mention : ${ed.honors.trim()}` : '',
                  ed.thesis?.trim() ? `Mémoire : ${ed.thesis.trim()}` : '',
                ])}
              </p>
            ) : null}
            {ed.details ? (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: theme.muted }}>
                {ed.details}
              </p>
            ) : null}
          </div>
        );
      })}
    </Section>
  );
}

export function SkillsBlock({
  data,
  c,
  theme,
  variant = 'list',
  onDark = false,
}: BlockProps & { variant?: 'list' | 'tags' | 'bars' | 'dots' | 'inline'; onDark?: boolean }) {
  const skills = data.skills.filter((s) => s.name.trim());
  if (!hasSection(data, c, 'skills')) return null;
  const textColor = onDark ? '#ffffff' : theme.text;
  const track = onDark ? 'rgba(255,255,255,0.25)' : '#e5e7eb';
  const groups = groupByCategory(skills);
  if (groups.length > 1 || groups[0]?.category) {
    return (
      <Section theme={theme} title={LABELS.skills}>
        {groups.map((g, i) => (
          <div key={g.category || i} style={{ marginTop: i === 0 ? 0 : 8, breakInside: 'avoid' }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: onDark ? '#ffffff' : theme.primary,
              }}
            >
              {g.category || 'Autres'}
            </p>
            {renderSkills(g.items, variant, theme, textColor, track, onDark)}
          </div>
        ))}
      </Section>
    );
  }
  return (
    <Section theme={theme} title={LABELS.skills}>
      {renderSkills(skills, variant, theme, textColor, track, onDark)}
    </Section>
  );
}

/** Keeps the candidate's order: categories appear in the order they were first used. */
function groupByCategory(skills: CvContent['skills']) {
  const groups: Array<{ category: string; items: CvContent['skills'] }> = [];
  for (const skill of skills) {
    const category = skill.category?.trim() ?? '';
    const group = groups.find((g) => g.category === category);
    if (group) group.items.push(skill);
    else groups.push({ category, items: [skill] });
  }
  return groups;
}

function renderSkills(
  skills: CvContent['skills'],
  variant: 'list' | 'tags' | 'bars' | 'dots' | 'inline',
  theme: Theme,
  textColor: string,
  track: string,
  onDark: boolean
): ReactNode {
  let body: ReactNode;
  if (variant === 'inline') {
    body = (
      <p style={{ margin: 0, fontSize: '0.8rem', color: textColor }}>
        {skills.map((s) => s.name).join(' · ')}
      </p>
    );
  } else if (variant === 'tags') {
    body = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {skills.map((s) => (
          <span
            key={s.id}
            style={{
              fontSize: '0.74rem',
              padding: '2px 9px',
              borderRadius: 999,
              border: `1px solid ${theme.accent}`,
              color: onDark ? '#ffffff' : theme.primary,
            }}
          >
            {s.name}
          </span>
        ))}
      </div>
    );
  } else if (variant === 'bars' || variant === 'dots') {
    body = (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {skills.map((s) => (
          <li key={s.id} style={{ marginBottom: 7, fontSize: '0.78rem', color: textColor }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <span>{s.name}</span>
              {variant === 'dots' && s.level ? (
                <span aria-label={skillLevelLabel(s.level)} style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: n <= (s.level ?? 0) ? theme.accent : track,
                      }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
            {variant === 'bars' && s.level ? (
              <div
                aria-label={skillLevelLabel(s.level)}
                style={{ marginTop: 3, height: 4, borderRadius: 999, background: track }}
              >
                <div
                  style={{
                    width: `${(Math.min(5, s.level) / 5) * 100}%`,
                    height: 4,
                    borderRadius: 999,
                    background: theme.accent,
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {skills.map((s) => (
          <li key={s.id} style={{ fontSize: '0.8rem', marginBottom: 4, color: textColor }}>
            {s.name}
            {s.level ? (
              <span style={{ color: onDark ? 'rgba(255,255,255,0.7)' : theme.muted }}>
                {' '}
                — {skillLevelLabel(s.level)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return body;
}

export function LanguagesBlock({
  data,
  theme,
  variant = 'list',
  onDark = false,
}: Omit<BlockProps, 'c'> & { variant?: 'list' | 'inline'; onDark?: boolean }) {
  const languages = data.languages.filter((l) => l.name.trim());
  if (languages.length === 0) return null;
  const textColor = onDark ? '#ffffff' : theme.text;
  return (
    <Section theme={theme} title={LABELS.languages}>
      {variant === 'inline' ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: textColor }}>
          {languages
            .map((l) => {
              const detail = joinParts([l.level, l.certification]);
              return detail ? `${l.name} (${detail})` : l.name;
            })
            .join(' · ')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {languages.map((l) => (
            <li key={l.id} style={{ fontSize: '0.8rem', marginBottom: 4, color: textColor }}>
              <strong style={{ fontWeight: 600 }}>{l.name}</strong>
              {l.level || l.certification ? (
                <span style={{ color: onDark ? 'rgba(255,255,255,0.7)' : theme.muted }}>
                  {' '}
                  — {joinParts([l.level, l.certification])}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function CertificationsBlock({
  data,
  c,
  theme,
  onDark = false,
}: BlockProps & { onDark?: boolean }) {
  const certs = data.certificates.filter((x) => x.name.trim());
  if (!hasSection(data, c, 'certifications')) return null;
  return (
    <Section theme={theme} title={LABELS.certifications}>
      {certs.map((cert, i) => (
        <div key={cert.id} style={{ marginTop: i === 0 ? 0 : 7, breakInside: 'avoid' }}>
          <strong
            style={{
              display: 'block',
              fontSize: '0.82rem',
              lineHeight: 1.35,
              color: onDark ? '#ffffff' : theme.text,
              fontWeight: 600,
            }}
          >
            {cert.name}
          </strong>
          {certMeta(cert) ? (
            <p
              style={{
                margin: '1px 0 0',
                fontSize: '0.75rem',
                color: onDark ? 'rgba(255,255,255,0.7)' : theme.muted,
              }}
            >
              {certMeta(cert)}
            </p>
          ) : null}
        </div>
      ))}
    </Section>
  );
}

/** `PMI · Obtenue : Juin 2021 · Expire : Juin 2027 · ID : 123 · credly.com/…` */
export function certMeta(cert: CvContent['certificates'][number]) {
  return joinParts([
    cert.issuer,
    cert.year ? `Obtenue : ${formatDateFr(cert.year)}` : '',
    cert.expires ? `Expire : ${formatDateFr(cert.expires)}` : '',
    cert.credentialId ? `ID : ${cert.credentialId}` : '',
    cert.url ? cert.url.replace(/^https?:\/\//, '') : '',
  ]);
}

export function ProjectsBlock({ data, c, theme }: BlockProps) {
  const projects = data.projects.filter((p) => p.name.trim());
  if (!hasSection(data, c, 'projects')) return null;
  return (
    <Section theme={theme} title={LABELS.projects}>
      {projects.map((p, i) => {
        const period = formatPeriod(p.start, p.end, p.current);
        const url = p.url?.replace(/^https?:\/\//, '');
        return (
          <div key={p.id} style={{ marginTop: i === 0 ? 0 : 9, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontFamily: theme.headerFont, fontSize: '0.86rem' }}>
                {p.name}
              </strong>
              {period || url ? (
                <span style={{ fontSize: '0.72rem', color: theme.muted, whiteSpace: 'nowrap' }}>
                  {period || url}
                </span>
              ) : null}
            </div>
            {p.role ? (
              <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: theme.primary }}>
                {p.role}
              </p>
            ) : null}
            {p.description ? (
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>{p.description}</p>
            ) : null}
            {p.technologies?.trim() || (period && url) ? (
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: theme.muted }}>
                {joinParts([
                  p.technologies?.trim() ? `Technologies : ${p.technologies.trim()}` : '',
                  period ? url : '',
                ])}
              </p>
            ) : null}
          </div>
        );
      })}
    </Section>
  );
}

/** Real references only; a placeholder entry becomes « disponibles sur demande ». */
export function ReferencesBlock({ data, c, theme }: BlockProps) {
  if (!c.showReferences) return null;
  const refs = (data.references ?? []).filter((r) => r.name.trim());
  if (refs.length === 0) return null;
  const placeholder = refs.every(
    (r) => /request|demande/i.test(r.name) && !r.contact && !r.role && !r.organization
  );
  return (
    <Section theme={theme} title={LABELS.references}>
      {placeholder ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: theme.muted }}>
          Références disponibles sur demande.
        </p>
      ) : (
        refs.map((r, i) => (
          <div key={r.id} style={{ marginTop: i === 0 ? 0 : 7, fontSize: '0.8rem' }}>
            <strong>{r.name}</strong>
            {r.role || r.organization ? (
              <span style={{ color: theme.muted }}>
                {' '}
                — {joinParts([r.role, r.organization], ', ')}
              </span>
            ) : null}
            {r.contact ? (
              <p style={{ margin: '1px 0 0', color: theme.muted }}>{r.contact}</p>
            ) : null}
          </div>
        ))
      )}
    </Section>
  );
}

/** Contacts as a wrapping row (`inline`) or one per line (`stacked`), with optional icons. */
export function ContactList({
  identity,
  color,
  iconColor,
  variant = 'inline',
  icons = true,
  separator = '·',
  fontSize = '0.78rem',
}: {
  identity: CvContent['identity'];
  color: string;
  iconColor?: string;
  variant?: 'inline' | 'stacked';
  icons?: boolean;
  separator?: string;
  fontSize?: string;
}) {
  const items = contactItems(identity);
  if (items.length === 0) return null;
  if (variant === 'stacked') {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize, color }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 5,
              wordBreak: 'break-all',
            }}
          >
            {icons ? <ContactIcon kind={item.kind} color={iconColor ?? color} /> : null}
            {item.value}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p
      style={{
        margin: 0,
        fontSize,
        color,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 10,
        rowGap: 3,
      }}
    >
      {items.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {icons ? <ContactIcon kind={item.kind} color={iconColor ?? color} /> : null}
          {item.value}
          {!icons && i < items.length - 1 ? (
            <span style={{ marginLeft: 10, opacity: 0.6 }}>{separator}</span>
          ) : null}
        </span>
      ))}
    </p>
  );
}

export function displayName(identity: CvContent['identity']) {
  return identity.fullName.trim() || 'Votre nom';
}

/** One dated entry of the optional sections: title + date on a line, then details. */
function Entry({
  theme,
  first,
  title,
  date,
  subtitle,
  body,
}: {
  theme: Theme;
  first: boolean;
  title: string;
  date?: string;
  subtitle?: string;
  body?: string;
}) {
  return (
    <div style={{ marginTop: first ? 0 : 8, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong style={{ fontFamily: theme.headerFont, fontSize: '0.86rem' }}>{title}</strong>
        {date ? (
          <span style={{ fontSize: '0.72rem', color: theme.muted, whiteSpace: 'nowrap' }}>
            {date}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: theme.primary }}>{subtitle}</p>
      ) : null}
      {body ? (
        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', whiteSpace: 'pre-line' }}>{body}</p>
      ) : null}
    </div>
  );
}

export function AwardsBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'awards')) return null;
  const items = (data.awards ?? []).filter((a) => a.name.trim());
  return (
    <Section theme={theme} title={LABELS.awards}>
      {items.map((a, i) => (
        <Entry
          key={a.id}
          theme={theme}
          first={i === 0}
          title={a.name}
          date={formatDateFr(a.date)}
          subtitle={a.issuer}
          body={a.description}
        />
      ))}
    </Section>
  );
}

export function VolunteeringBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'volunteering')) return null;
  const items = (data.volunteering ?? []).filter((v) => v.organization.trim() || v.role?.trim());
  return (
    <Section theme={theme} title={LABELS.volunteering}>
      {items.map((v, i) => (
        <Entry
          key={v.id}
          theme={theme}
          first={i === 0}
          title={v.role?.trim() || v.organization}
          date={formatPeriod(v.start, v.end, v.current)}
          subtitle={joinParts([v.role?.trim() ? v.organization : '', v.location])}
          body={v.description}
        />
      ))}
    </Section>
  );
}

export function PublicationsBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'publications')) return null;
  const items = (data.publications ?? []).filter((p) => p.title.trim());
  return (
    <Section theme={theme} title={LABELS.publications}>
      {items.map((p, i) => (
        <Entry
          key={p.id}
          theme={theme}
          first={i === 0}
          title={p.title}
          date={formatDateFr(p.date)}
          subtitle={joinParts([p.type, p.publisher, p.authors])}
          body={p.url?.replace(/^https?:\/\//, '')}
        />
      ))}
    </Section>
  );
}

export function TalksBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'talks')) return null;
  const items = (data.talks ?? []).filter((t) => t.event.trim() || t.topic?.trim());
  return (
    <Section theme={theme} title={LABELS.talks}>
      {items.map((t, i) => (
        <Entry
          key={t.id}
          theme={theme}
          first={i === 0}
          title={joinParts([t.role, t.topic?.trim() ? t.topic : t.event], ' — ')}
          date={formatDateFr(t.date)}
          subtitle={joinParts([t.topic?.trim() ? t.event : '', t.organizer, t.location])}
        />
      ))}
    </Section>
  );
}

/** « Permis B — obtenu : 2022 », « Habilitation électrique B1V · Apave — expire : Mars 2027 ». */
export function LicensesBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'licenses')) return null;
  const items = (data.licenses ?? []).filter((l) => l.name.trim());
  return (
    <Section theme={theme} title={LABELS.licenses}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem' }}>
        {items.map((l) => {
          const detail = joinParts([
            l.issuer,
            l.date ? `obtenu : ${formatDateFr(l.date)}` : '',
            l.expires ? `expire : ${formatDateFr(l.expires)}` : '',
          ]);
          return (
            <li key={l.id} style={{ marginBottom: 4 }}>
              <strong style={{ fontWeight: 600 }}>{l.name}</strong>
              {detail ? <span style={{ color: theme.muted }}> — {detail}</span> : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function InterestsBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'interests')) return null;
  const items = (data.interests ?? []).map((i) => i.name.trim()).filter(Boolean);
  return (
    <Section theme={theme} title={LABELS.interests}>
      <p style={{ margin: 0, fontSize: '0.8rem' }}>{items.join(' · ')}</p>
    </Section>
  );
}

/** Availability, mobility and free « label : value » facts. */
export function AdditionalInfoBlock({ data, c, theme }: BlockProps) {
  if (!hasSection(data, c, 'additional')) return null;
  const x = data.extras ?? {};
  const rows: Array<[string, string]> = [];
  const availability = joinParts([x.availability, x.notice ? `préavis : ${x.notice}` : '']);
  if (availability) rows.push(['Disponibilité', availability]);
  const mobility = joinParts([x.desiredLocation, ...(x.mobility ?? [])]);
  if (mobility) rows.push(['Mobilité', mobility]);
  for (const info of data.additionalInfo ?? []) {
    if (info.label.trim() || info.value.trim()) rows.push([info.label.trim(), info.value.trim()]);
  }
  return (
    <Section theme={theme} title={LABELS.additional}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem' }}>
        {rows.map(([label, value], i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {label ? <strong style={{ fontWeight: 600 }}>{label}</strong> : null}
            {label && value ? ' : ' : null}
            {value}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * The optional sections in the standard order (distinctions, bénévolat, publications,
 * conférences, permis, centres d'intérêt, informations complémentaires). Each one renders only
 * when the candidate filled it in, so a template can drop this in once before the references.
 */
export function MoreSections(props: BlockProps) {
  return (
    <>
      <AwardsBlock {...props} />
      <VolunteeringBlock {...props} />
      <PublicationsBlock {...props} />
      <TalksBlock {...props} />
      <LicensesBlock {...props} />
      <InterestsBlock {...props} />
      <AdditionalInfoBlock {...props} />
    </>
  );
}

export const MORE_SECTION_NAMES = [
  'awards',
  'volunteering',
  'publications',
  'talks',
  'licenses',
  'interests',
  'additional',
] as const satisfies readonly SectionName[];

/* Helpers for the first-generation templates (Modern, Creative, Executive, Startup, ATS), which
   lay out their sections by hand but should still show the fields added to each section. */

export function locationOf(identity: CvContent['identity']) {
  return joinParts([identity.address, identity.city, identity.country], ', ');
}

/** `Abidjan · CDI · Distribution` */
export function experienceMeta(exp: CvContent['experiences'][number]) {
  return joinParts([exp.location, exp.contractType, exp.sector]);
}

/** `Mention : Bien · Mémoire : …` */
export function educationExtras(ed: CvContent['education'][number]) {
  return joinParts([
    ed.honors?.trim() ? `Mention : ${ed.honors.trim()}` : '',
    ed.thesis?.trim() ? `Mémoire : ${ed.thesis.trim()}` : '',
  ]);
}

/** `B2 · TOEIC 850` */
export function languageDetail(lang: CvContent['languages'][number]) {
  return joinParts([lang.level, lang.certification]);
}

/** Achievements and tools under an experience's responsibilities. */
export function ExperienceExtras({
  exp,
  muted,
  ats = false,
}: {
  exp: CvContent['experiences'][number];
  muted: string;
  ats?: boolean;
}) {
  const achievements = lines(exp.achievements);
  const tools = exp.tools?.trim();
  if (achievements.length === 0 && !tools) return null;
  if (ats) {
    return (
      <>
        {achievements.length > 0 ? <p style={{ margin: '2pt 0' }}>Réalisations :</p> : null}
        {achievements.map((a, i) => (
          <p key={i} style={{ margin: '2pt 0 2pt 12pt' }}>
            - {a}
          </p>
        ))}
        {tools ? <p style={{ margin: '2pt 0' }}>Outils : {tools}</p> : null}
      </>
    );
  }
  return (
    <>
      {achievements.length > 0 ? (
        <>
          <p style={{ margin: '4px 0 0', fontSize: '0.76rem', fontWeight: 600 }}>Réalisations</p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', listStyle: 'disc' }}>
            {achievements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      ) : null}
      {tools ? (
        <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: muted }}>Outils : {tools}</p>
      ) : null}
    </>
  );
}
