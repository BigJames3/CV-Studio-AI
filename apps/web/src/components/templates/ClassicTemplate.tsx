import type { TemplateProps } from './shared';
import { Photo, densityStyle } from './shared';
import {
  CertificationsBlock,
  ContactList,
  EducationBlock,
  ExperienceBlock,
  LanguagesBlock,
  MoreSections,
  ProjectsBlock,
  ReferencesBlock,
  SkillsBlock,
  SummaryBlock,
  displayName,
  themeFrom,
} from './blocks';

/** Classique — une colonne, police à empattement, en-tête centré. Administration, droit. */
export function ClassicTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'serif', '#4b5563');
  const { identity } = data;
  return (
    <div
      data-cv-flow=""
      style={{
        ...densityStyle(c.density),
        padding: '2.2rem 2.4rem',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header style={{ textAlign: 'center' }}>
        {c.showPhoto ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Photo
              url={identity.photoUrl}
              name={identity.fullName}
              size={76}
              borderColor={c.accentColor}
            />
          </div>
        ) : null}
        <h1
          style={{
            margin: 0,
            fontFamily: c.headerFont,
            fontSize: '1.7rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: c.primaryColor,
          }}
        >
          {displayName(identity)}
        </h1>
        {identity.headline ? (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.95rem', fontStyle: 'italic' }}>
            {identity.headline}
          </p>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <ContactList identity={identity} color="#374151" icons={false} />
        </div>
        <div style={{ margin: '14px auto 0', width: 80, height: 2, background: c.accentColor }} />
      </header>
      <SummaryBlock data={data} c={c} theme={theme} />
      <ExperienceBlock data={data} c={c} theme={theme} />
      <SkillsBlock data={data} c={c} theme={theme} variant="inline" />
      <EducationBlock data={data} c={c} theme={theme} />
      <CertificationsBlock data={data} c={c} theme={theme} />
      <LanguagesBlock data={data} theme={theme} variant="inline" />
      <ProjectsBlock data={data} c={c} theme={theme} />
      <MoreSections data={data} c={c} theme={theme} />
      <ReferencesBlock data={data} c={c} theme={theme} />
    </div>
  );
}
