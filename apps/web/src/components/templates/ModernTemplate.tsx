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

/** Minimaliste 2 colonnes — sidebar profil + contenu */
export function ModernTemplate({ data, customization: c }: TemplateProps) {
  const { identity, summary, experiences, education, skills, projects, certificates } = data;
  const tone = { color: c.primaryColor, headerFont: c.headerFont, mutedColor: '#6b7280' };

  return (
    <div
      style={{
        ...densityStyle(c.density),
        display: 'grid',
        gridTemplateColumns: '32% 68%',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <aside
        style={{
          background: '#f8fafc',
          padding: '2rem 1.25rem',
          borderRight: `3px solid ${c.primaryColor}`,
        }}
      >
        {c.showPhoto ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <Photo url={identity.photoUrl} name={identity.fullName} borderColor={c.primaryColor} />
          </div>
        ) : null}
        <p
          style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 600,
            color: c.primaryColor,
            letterSpacing: '0.06em',
          }}
        >
          CONTACT
        </p>
        <p style={{ marginTop: 8, fontSize: '0.75rem', lineHeight: 1.6 }}>
          {contactLine(identity)}
        </p>

        {c.showSkills && skills.length > 0 ? (
          <div style={{ marginTop: 'var(--cv-section-gap)' }}>
            <SectionTitle color={c.primaryColor}>Skills</SectionTitle>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
              {skills.map((s) => (
                <li key={s.id} style={{ fontSize: '0.8rem', marginBottom: 6 }}>
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.languages.length > 0 ? (
          <div style={{ marginTop: 'var(--cv-section-gap)' }}>
            <SectionTitle color={c.primaryColor}>Languages</SectionTitle>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
              {data.languages.map((l) => (
                <li key={l.id} style={{ fontSize: '0.8rem', marginBottom: 6 }}>
                  {l.name}
                  {l.level ? ` — ${l.level}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {c.showCertificates && certificates.length > 0 ? (
          <CertificatesSection certificates={certificates} tone={tone} compact />
        ) : null}
      </aside>

      <main style={{ padding: '2rem 1.75rem' }}>
        <h1 style={{ margin: 0, fontFamily: c.headerFont, fontSize: '1.75rem', fontWeight: 700 }}>
          {identity.fullName || 'Your Name'}
        </h1>
        {identity.headline ? (
          <p style={{ margin: '0.35rem 0 0', color: c.primaryColor, fontWeight: 600 }}>
            {identity.headline}
          </p>
        ) : null}

        {c.showSummary && summary.text ? (
          <section style={{ marginTop: 'var(--cv-section-gap)' }}>
            <SectionTitle color={c.primaryColor} underline>
              Profile
            </SectionTitle>
            <p style={{ marginTop: 10, fontSize: '0.875rem' }}>{summary.text}</p>
          </section>
        ) : null}

        {c.showExperience && experiences.length > 0 ? (
          <section style={{ marginTop: 'var(--cv-section-gap)' }}>
            <SectionTitle color={c.primaryColor} underline>
              Experience
            </SectionTitle>
            {experiences.map((exp) => (
              <div key={exp.id} style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontFamily: c.headerFont }}>{exp.title}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {formatRange(exp.start, exp.end, exp.current)}
                  </span>
                </div>
                <p style={{ margin: '2px 0 6px', fontSize: '0.8rem', color: c.primaryColor }}>
                  {exp.company}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {c.showProjects && projects.length > 0 ? (
          <ProjectsSection projects={projects} tone={tone} />
        ) : null}

        {c.showEducation && education.length > 0 ? (
          <section style={{ marginTop: 'var(--cv-section-gap)' }}>
            <SectionTitle color={c.primaryColor} underline>
              Education
            </SectionTitle>
            {education.map((ed) => (
              <div key={ed.id} style={{ marginTop: 10 }}>
                <strong style={{ fontFamily: c.headerFont }}>{ed.school}</strong>
                <p style={{ margin: '2px 0', fontSize: '0.8rem' }}>
                  {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
