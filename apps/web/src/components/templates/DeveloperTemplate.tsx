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

const MONO = 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, monospace';

/** Développeur — accents « code », compétences en étiquettes et projets en avant. Tech, data. */
export function DeveloperTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'code', '#64748b');
  const { identity } = data;
  return (
    <div
      data-cv-flow=""
      style={{
        ...densityStyle(c.density),
        padding: '2rem 2.2rem',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        {c.showPhoto ? (
          <Photo
            url={identity.photoUrl}
            name={identity.fullName}
            size={72}
            borderColor={c.accentColor}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: c.headerFont,
              fontSize: '1.8rem',
              fontWeight: 700,
              color: c.primaryColor,
            }}
          >
            {displayName(identity)}
          </h1>
          {identity.headline ? (
            <p
              style={{
                margin: '0.2rem 0 0.6rem',
                fontFamily: MONO,
                fontSize: '0.88rem',
                color: c.accentColor,
              }}
            >
              {'> '}
              {identity.headline}
            </p>
          ) : null}
          <ContactList
            identity={identity}
            color="#334155"
            iconColor={c.accentColor}
            fontSize="0.74rem"
          />
        </div>
      </header>
      <SummaryBlock data={data} c={c} theme={theme} />
      <SkillsBlock data={data} c={c} theme={theme} variant="tags" />
      <ExperienceBlock data={data} c={c} theme={theme} />
      <ProjectsBlock data={data} c={c} theme={theme} />
      <MoreSections data={data} c={c} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
        <div>
          <EducationBlock data={data} c={c} theme={theme} />
          <LanguagesBlock data={data} theme={theme} />
        </div>
        <div>
          <CertificationsBlock data={data} c={c} theme={theme} />
          <ReferencesBlock data={data} c={c} theme={theme} />
        </div>
      </div>
    </div>
  );
}
