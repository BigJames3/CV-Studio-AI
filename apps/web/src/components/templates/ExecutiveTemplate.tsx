import type { TemplateProps } from './shared';
import {
  Photo,
  SectionTitle,
  CertificatesSection,
  ProjectsSection,
  contactLine,
  densityStyle,
  formatRange,
} from './shared';

/** Formel — vertical, accents or */
export function ExecutiveTemplate({ data, customization: c }: TemplateProps) {
  const { identity, summary, experiences, education, skills, references, projects, certificates } =
    data;
  const tone = { color: c.accentColor, headerFont: c.headerFont, mutedColor: '#4b5563' };

  return (
    <div
      style={{
        ...densityStyle(c.density),
        padding: '1.75rem 2rem',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
        minHeight: '100%',
      }}
    >
      <header
        style={{
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
          borderBottom: `1px solid ${c.accentColor}`,
          paddingBottom: 14,
        }}
      >
        {c.showPhoto ? (
          <Photo
            url={identity.photoUrl}
            name={identity.fullName}
            size={72}
            borderColor={c.accentColor}
          />
        ) : null}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: c.headerFont,
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {identity.fullName || 'Your Name'}
          </h1>
          {identity.headline ? (
            <p
              style={{
                margin: '4px 0 0',
                color: c.accentColor,
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {identity.headline}
            </p>
          ) : null}
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#4b5563' }}>
            {contactLine(identity)}
          </p>
        </div>
      </header>

      {c.showSummary && summary.text ? (
        <section style={{ marginTop: 'var(--cv-section-gap)' }}>
          <SectionTitle color={c.accentColor}>Professional Summary</SectionTitle>
          <p style={{ marginTop: 8, fontSize: '0.85rem', textAlign: 'justify' }}>{summary.text}</p>
        </section>
      ) : null}

      {c.showExperience && experiences.length > 0 ? (
        <section style={{ marginTop: 'var(--cv-section-gap)' }}>
          <SectionTitle color={c.accentColor}>Professional Experience</SectionTitle>
          {experiences.map((exp) => (
            <div key={exp.id} style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontFamily: c.headerFont, fontSize: '0.9rem' }}>
                  {exp.title}, {exp.company}
                </strong>
                <span style={{ fontSize: '0.75rem' }}>
                  {formatRange(exp.start, exp.end, exp.current)}
                </span>
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
                {exp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {c.showEducation && education.length > 0 ? (
        <section style={{ marginTop: 'var(--cv-section-gap)' }}>
          <SectionTitle color={c.accentColor}>Education</SectionTitle>
          {education.map((ed) => (
            <p key={ed.id} style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
              <strong>{ed.degree}</strong>
              {ed.field ? `, ${ed.field}` : ''} — {ed.school}
              {ed.end ? ` (${ed.end})` : ''}
            </p>
          ))}
        </section>
      ) : null}

      {c.showSkills && skills.length > 0 ? (
        <section style={{ marginTop: 'var(--cv-section-gap)' }}>
          <SectionTitle color={c.accentColor}>Core Competencies</SectionTitle>
          <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
            {skills.map((s) => s.name).join(' · ')}
          </p>
        </section>
      ) : null}

      {c.showProjects && projects.length > 0 ? (
        <ProjectsSection projects={projects} tone={tone} title="Selected Projects" />
      ) : null}

      {c.showCertificates && certificates.length > 0 ? (
        <CertificatesSection
          certificates={certificates}
          tone={tone}
          title="Professional Certifications"
        />
      ) : null}

      {c.showReferences && references && references.length > 0 ? (
        <section style={{ marginTop: 'var(--cv-section-gap)' }}>
          <SectionTitle color={c.accentColor}>References</SectionTitle>
          {references.map((r) => (
            <p key={r.id} style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
              {r.name}
              {r.role ? ` — ${r.role}` : ''}
              {r.contact ? ` (${r.contact})` : ''}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
