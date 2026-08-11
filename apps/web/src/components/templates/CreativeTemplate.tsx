import type { TemplateProps } from './shared';
import {
  Photo,
  CertificatesSection,
  ProjectsSection,
  contactLine,
  densityStyle,
  formatRange,
} from './shared';

function Icon({ label }: { label: string }) {
  const map: Record<string, string> = {
    work: '💼',
    education: '🎓',
    skills: '✦',
    about: '◎',
  };
  return (
    <span aria-hidden style={{ marginRight: 8 }}>
      {map[label] ?? '•'}
    </span>
  );
}

/** Coloré — header gradient, icons, timeline */
export function CreativeTemplate({ data, customization: c }: TemplateProps) {
  const { identity, summary, experiences, education, skills, projects, certificates } = data;
  const tone = { color: c.primaryColor, headerFont: c.headerFont, mutedColor: '#6b7280' };

  return (
    <div
      style={{
        ...densityStyle(c.density),
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
        minHeight: '100%',
      }}
    >
      <header
        style={{
          background: `linear-gradient(135deg, ${c.primaryColor} 0%, #7c3aed 55%, ${c.accentColor} 100%)`,
          color: '#fff',
          padding: '2rem 1.75rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
        }}
      >
        {c.showPhoto ? <Photo url={identity.photoUrl} name={identity.fullName} size={96} /> : null}
        <div>
          <h1 style={{ margin: 0, fontFamily: c.headerFont, fontSize: '1.85rem', fontWeight: 800 }}>
            {identity.fullName || 'Your Name'}
          </h1>
          {identity.headline ? (
            <p style={{ margin: '0.35rem 0 0', opacity: 0.95, fontWeight: 500 }}>
              {identity.headline}
            </p>
          ) : null}
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
            {contactLine(identity)}
          </p>
        </div>
      </header>

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {c.showSummary && summary.text ? (
          <section style={{ marginBottom: 'var(--cv-section-gap)' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: c.headerFont,
                fontSize: '1rem',
                color: c.primaryColor,
              }}
            >
              <Icon label="about" />
              About
            </h2>
            <p style={{ marginTop: 8, fontSize: '0.875rem' }}>{summary.text}</p>
          </section>
        ) : null}

        {c.showExperience && experiences.length > 0 ? (
          <section style={{ marginBottom: 'var(--cv-section-gap)' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: c.headerFont,
                fontSize: '1rem',
                color: c.primaryColor,
              }}
            >
              <Icon label="work" />
              Experience
            </h2>
            <div
              style={{ marginTop: 12, borderLeft: `3px solid ${c.accentColor}`, paddingLeft: 16 }}
            >
              {experiences.map((exp) => (
                <div key={exp.id} style={{ position: 'relative', marginBottom: 16 }}>
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: -23,
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c.accentColor,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontFamily: c.headerFont }}>{exp.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatRange(exp.start, exp.end, exp.current)}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 6px', color: c.accentColor, fontSize: '0.85rem' }}>
                    {exp.company}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
                    {exp.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {c.showEducation && education.length > 0 ? (
            <section>
              <h2
                style={{
                  margin: 0,
                  fontFamily: c.headerFont,
                  fontSize: '1rem',
                  color: c.primaryColor,
                }}
              >
                <Icon label="education" />
                Education
              </h2>
              {education.map((ed) => (
                <div key={ed.id} style={{ marginTop: 8, fontSize: '0.8rem' }}>
                  <strong>{ed.school}</strong>
                  <p style={{ margin: '2px 0' }}>
                    {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {c.showSkills && skills.length > 0 ? (
            <section>
              <h2
                style={{
                  margin: 0,
                  fontFamily: c.headerFont,
                  fontSize: '1rem',
                  color: c.primaryColor,
                }}
              >
                <Icon label="skills" />
                Skills
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {skills.map((s) => (
                  <span
                    key={s.id}
                    style={{
                      fontSize: '0.7rem',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: `${c.primaryColor}15`,
                      color: c.primaryColor,
                      fontWeight: 600,
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {c.showProjects && projects.length > 0 ? (
          <ProjectsSection projects={projects} tone={tone} />
        ) : null}

        {c.showCertificates && certificates.length > 0 ? (
          <CertificatesSection certificates={certificates} tone={tone} />
        ) : null}
      </div>
    </div>
  );
}
