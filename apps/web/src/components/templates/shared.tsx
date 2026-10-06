import type { CSSProperties, ReactNode } from 'react';
import type { CvContent, DensityPreset, TemplateCustomization } from '@/lib/templates/types';
import { DENSITY_SCALE } from '@/lib/templates/types';
import { certMeta, formatPeriod, joinParts, locationOf } from './blocks';

export function formatRange(start?: string, end?: string | null, current?: boolean) {
  if (!start) return '';
  if (current || !end) return `${start} – Present`;
  return `${start} – ${end}`;
}

export function densityStyle(density: DensityPreset) {
  const d = DENSITY_SCALE[density];
  return {
    ['--cv-section-gap' as string]: d.sectionGap,
    lineHeight: d.lineHeight,
    fontSize: `${d.fontScale}rem`,
  } as CSSProperties;
}

export function contactLine(identity: CvContent['identity']) {
  return [
    identity.email,
    identity.phone,
    locationOf(identity),
    identity.linkedin,
    identity.github,
    identity.website,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function Photo({
  url,
  name,
  size = 88,
  borderColor,
}: {
  url?: string | null;
  name: string;
  size?: number;
  borderColor?: string;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '9999px',
          objectFit: 'cover',
          flexShrink: 0,
          border: borderColor ? `3px solid ${borderColor}` : undefined,
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        flexShrink: 0,
        background: borderColor ?? '#e5e7eb',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.28,
      }}
    >
      {initials || 'CV'}
    </div>
  );
}

export function SectionTitle({
  children,
  color,
  underline,
  ats,
}: {
  children: ReactNode;
  color?: string;
  underline?: boolean;
  ats?: boolean;
}) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: ats ? '11pt' : '0.7rem',
        fontWeight: 700,
        letterSpacing: ats ? '0' : '0.08em',
        textTransform: ats ? 'none' : 'uppercase',
        color: color ?? '#111827',
        borderBottom: underline ? `2px solid ${color ?? '#111827'}` : undefined,
        paddingBottom: underline ? 4 : undefined,
      }}
    >
      {children}
    </h2>
  );
}

export type TemplateProps = {
  data: CvContent;
  customization: TemplateCustomization;
};

type SectionTone = {
  color?: string;
  headerFont?: string;
  mutedColor?: string;
};

/** Shared projects block — styled per template via tone + optional wrapper styles */
export function ProjectsSection({
  projects,
  tone,
  ats,
  title = 'Projects',
  cardStyle,
}: {
  projects: CvContent['projects'];
  tone?: SectionTone;
  ats?: boolean;
  title?: string;
  cardStyle?: CSSProperties;
}) {
  if (!projects.length) return null;

  return (
    <section style={{ marginTop: 'var(--cv-section-gap)' }}>
      <SectionTitle color={tone?.color} underline={!ats} ats={ats}>
        {ats ? title.toUpperCase() : title}
      </SectionTitle>
      {projects.map((p) => (
        <div key={p.id} style={{ marginTop: ats ? 8 : 12, ...(cardStyle ?? {}) }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              alignItems: 'baseline',
            }}
          >
            <strong style={{ fontFamily: tone?.headerFont, fontSize: ats ? '11pt' : '0.875rem' }}>
              {p.name}
            </strong>
            {p.url ? (
              <span
                style={{ fontSize: ats ? '9pt' : '0.7rem', color: tone?.mutedColor ?? '#6b7280' }}
              >
                {p.url.replace(/^https?:\/\//, '')}
              </span>
            ) : null}
          </div>
          {p.role || p.start || p.end || p.current ? (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: ats ? '10pt' : '0.75rem',
                color: tone?.mutedColor ?? '#6b7280',
              }}
            >
              {joinParts([p.role, formatPeriod(p.start, p.end, p.current)])}
            </p>
          ) : null}
          {p.description ? (
            <p style={{ margin: '4px 0 0', fontSize: ats ? '10pt' : '0.8rem' }}>{p.description}</p>
          ) : null}
          {p.technologies?.trim() ? (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: ats ? '10pt' : '0.75rem',
                color: tone?.mutedColor ?? '#6b7280',
              }}
            >
              Technologies : {p.technologies.trim()}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function CertificatesSection({
  certificates,
  tone,
  ats,
  title = 'Certifications',
  compact,
}: {
  certificates: CvContent['certificates'];
  tone?: SectionTone;
  ats?: boolean;
  title?: string;
  /** Single-line list for sidebars / ATS */
  compact?: boolean;
}) {
  if (!certificates.length) return null;

  if (compact || ats) {
    return (
      <section style={{ marginTop: 'var(--cv-section-gap)' }}>
        <SectionTitle color={tone?.color} underline={!ats} ats={ats}>
          {ats ? title.toUpperCase() : title}
        </SectionTitle>
        {ats ? (
          certificates.map((cert) => (
            <p key={cert.id} style={{ margin: '6pt 0 0', fontSize: '10pt' }}>
              {cert.name}
              {certMeta(cert) ? ` — ${certMeta(cert)}` : ''}
            </p>
          ))
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
            {certificates.map((cert) => (
              <li key={cert.id} style={{ fontSize: '0.8rem', marginBottom: 6 }}>
                <strong>{cert.name}</strong>
                {certMeta(cert) ? (
                  <span style={{ color: tone?.mutedColor ?? '#6b7280' }}> — {certMeta(cert)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section style={{ marginTop: 'var(--cv-section-gap)' }}>
      <SectionTitle color={tone?.color} underline>
        {title}
      </SectionTitle>
      {certificates.map((cert) => (
        <div key={cert.id} style={{ marginTop: 10 }}>
          <strong style={{ fontFamily: tone?.headerFont, fontSize: '0.875rem' }}>
            {cert.name}
          </strong>
          <p
            style={{ margin: '2px 0 0', fontSize: '0.8rem', color: tone?.mutedColor ?? '#6b7280' }}
          >
            {certMeta(cert)}
          </p>
        </div>
      ))}
    </section>
  );
}
