import type { TemplateProps } from './shared';
import {
  SectionTitle,
  CertificatesSection,
  ProjectsSection,
  contactLine,
  densityStyle,
  formatRange,
} from './shared';

/**
 * ATS-Optimized — single column, black on white, no icons/graphics/borders/tables.
 */
export function ATSTemplate({ data, customization: c }: TemplateProps) {
  const { identity, summary, experiences, education, skills, languages, projects, certificates } =
    data;

  return (
    <div
      style={{
        ...densityStyle(c.density),
        padding: '0.5in',
        background: '#ffffff',
        color: '#000000',
        fontFamily: c.bodyFont || 'Arial, Calibri, sans-serif',
        fontSize: '11pt',
        minHeight: '100%',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '16pt', fontWeight: 700, fontFamily: c.headerFont }}>
        {identity.fullName || 'Your Name'}
      </h1>
      {identity.headline ? (
        <p style={{ margin: '4pt 0 0', fontSize: '11pt' }}>{identity.headline}</p>
      ) : null}
      <p style={{ margin: '6pt 0 0', fontSize: '10pt' }}>{contactLine(identity)}</p>

      {c.showSummary && summary.text ? (
        <section style={{ marginTop: 14 }}>
          <SectionTitle ats>SUMMARY</SectionTitle>
          <p style={{ marginTop: 6 }}>{summary.text}</p>
        </section>
      ) : null}

      {c.showExperience && experiences.length > 0 ? (
        <section style={{ marginTop: 14 }}>
          <SectionTitle ats>EXPERIENCE</SectionTitle>
          {experiences.map((exp) => (
            <div key={exp.id} style={{ marginTop: 10 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {exp.title} | {exp.company}
              </p>
              <p style={{ margin: '2pt 0' }}>{formatRange(exp.start, exp.end, exp.current)}</p>
              {exp.bullets.map((b, i) => (
                <p key={i} style={{ margin: '2pt 0 2pt 12pt' }}>
                  - {b}
                </p>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {c.showProjects && projects.length > 0 ? (
        <ProjectsSection projects={projects} ats />
      ) : null}

      {c.showEducation && education.length > 0 ? (
        <section style={{ marginTop: 14 }}>
          <SectionTitle ats>EDUCATION</SectionTitle>
          {education.map((ed) => (
            <p key={ed.id} style={{ margin: '8pt 0 0' }}>
              {ed.degree}
              {ed.field ? `, ${ed.field}` : ''} | {ed.school}
              {ed.end ? ` | ${ed.end}` : ''}
            </p>
          ))}
        </section>
      ) : null}

      {c.showSkills && skills.length > 0 ? (
        <section style={{ marginTop: 14 }}>
          <SectionTitle ats>SKILLS</SectionTitle>
          <p style={{ marginTop: 6 }}>{skills.map((s) => s.name).join(', ')}</p>
        </section>
      ) : null}

      {c.showCertificates && certificates.length > 0 ? (
        <CertificatesSection certificates={certificates} ats />
      ) : null}

      {languages.length > 0 ? (
        <section style={{ marginTop: 14 }}>
          <SectionTitle ats>LANGUAGES</SectionTitle>
          <p style={{ marginTop: 6 }}>
            {languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')}
          </p>
        </section>
      ) : null}
    </div>
  );
}
