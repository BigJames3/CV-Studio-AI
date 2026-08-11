import type { TemplateProps } from './shared';
import { densityStyle, formatRange } from './shared';

/** Asymétrique, Poppins, accents néon — achievements first */
export function StartupTemplate({ data, customization: c }: TemplateProps) {
  const { identity, summary, experiences, education, skills, projects, certificates } = data;

  return (
    <div
      style={{
        ...densityStyle(c.density),
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
        minHeight: '100%',
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '1.25rem',
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 999,
            background: c.accentColor,
            color: '#0f172a',
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Open to work
        </div>
        <h1
          style={{
            margin: '0.75rem 0 0',
            fontFamily: c.headerFont,
            fontSize: '2.1rem',
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {identity.fullName || 'Your Name'}
        </h1>
        {identity.headline ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '1rem', fontWeight: 600 }}>
            {identity.headline}
          </p>
        ) : null}
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          {[identity.email, identity.city, identity.website].filter(Boolean).join('  ·  ')}
        </p>

        {c.showSummary && summary.text ? (
          <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
            {summary.text}
          </p>
        ) : null}

        {c.showExperience && experiences.length > 0 ? (
          <section style={{ marginTop: 'var(--cv-section-gap)' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: c.headerFont,
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: c.accentColor,
              }}
            >
              Impact
            </h2>
            {experiences.map((exp) => (
              <div
                key={exp.id}
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${c.primaryColor}22`,
                  background: '#fff',
                }}
              >
                <strong style={{ fontFamily: c.headerFont }}>{exp.title}</strong>
                <p style={{ margin: '2px 0 8px', fontSize: '0.75rem', color: '#64748b' }}>
                  {exp.company} · {formatRange(exp.start, exp.end, exp.current)}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem' }}>
                  {exp.bullets.slice(0, 2).map((b, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <span style={{ color: c.accentColor, fontWeight: 700 }}>→ </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {c.showProjects && projects.length > 0 ? (
          <section style={{ marginTop: 'var(--cv-section-gap)' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: c.headerFont,
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: c.accentColor,
              }}
            >
              Builds
            </h2>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${c.accentColor}55`,
                  background: '#fff',
                }}
              >
                <strong style={{ fontFamily: c.headerFont }}>{p.name}</strong>
                {p.url ? (
                  <p style={{ margin: '2px 0 6px', fontSize: '0.7rem', color: c.accentColor }}>
                    {p.url.replace(/^https?:\/\//, '')}
                  </p>
                ) : null}
                {p.description ? (
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{p.description}</p>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
      </div>

      <aside
        style={{
          background: c.primaryColor,
          color: '#f8fafc',
          borderRadius: 16,
          padding: '1.25rem',
          alignSelf: 'stretch',
        }}
      >
        {c.showSkills && skills.length > 0 ? (
          <section>
            <h2
              style={{
                margin: 0,
                fontSize: '0.7rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: c.accentColor,
              }}
            >
              Stack
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
              {skills.map((s) => (
                <li
                  key={s.id}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {c.showEducation && education.length > 0 ? (
          <section style={{ marginTop: '1.5rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '0.7rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: c.accentColor,
              }}
            >
              Education
            </h2>
            {education.map((ed) => (
              <div key={ed.id} style={{ marginTop: 10, fontSize: '0.8rem' }}>
                <strong>{ed.school}</strong>
                <p style={{ margin: '2px 0', opacity: 0.85 }}>
                  {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {c.showCertificates && certificates.length > 0 ? (
          <section style={{ marginTop: '1.5rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '0.7rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: c.accentColor,
              }}
            >
              Certs
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
              {certificates.map((cert) => (
                <li key={cert.id} style={{ fontSize: '0.8rem', marginBottom: 10, opacity: 0.95 }}>
                  <strong>{cert.name}</strong>
                  <p style={{ margin: '2px 0', opacity: 0.8 }}>
                    {[cert.issuer, cert.year].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
