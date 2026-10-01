import type { TemplateProps } from './shared';
import { Photo, densityStyle } from './shared';
import {
  CertificationsBlock,
  ContactList,
  EducationBlock,
  ExperienceBlock,
  LanguagesBlock,
  ProjectsBlock,
  ReferencesBlock,
  SkillsBlock,
  SummaryBlock,
  displayName,
  themeFrom,
} from './blocks';

/** Santé — sobre, tons doux, certifications juste après le profil. Médical, paramédical. */
export function HealthTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'caps');
  const { identity } = data;
  return (
    <div
      style={{
        ...densityStyle(c.density),
        minHeight: '297mm',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
        display: 'grid',
        gridTemplateColumns: '10px 1fr',
      }}
    >
      <div style={{ background: c.accentColor }} />
      <div style={{ padding: '2rem 2.2rem' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            paddingBottom: 14,
            borderBottom: `1px solid ${c.accentColor}`,
          }}
        >
          {c.showPhoto ? (
            <Photo
              url={identity.photoUrl}
              name={identity.fullName}
              size={80}
              borderColor={c.accentColor}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: c.headerFont,
                fontSize: '1.75rem',
                fontWeight: 700,
                color: c.primaryColor,
              }}
            >
              {displayName(identity)}
            </h1>
            {identity.headline ? (
              <p style={{ margin: '0.2rem 0 0.6rem', fontSize: '0.95rem', color: c.primaryColor }}>
                {identity.headline}
              </p>
            ) : null}
            <ContactList
              identity={identity}
              color="#374151"
              iconColor={c.primaryColor}
              fontSize="0.76rem"
            />
          </div>
        </header>
        <SummaryBlock data={data} c={c} theme={theme} />
        <CertificationsBlock data={data} c={c} theme={theme} />
        <ExperienceBlock data={data} c={c} theme={theme} />
        <EducationBlock data={data} c={c} theme={theme} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
          <SkillsBlock data={data} c={c} theme={theme} />
          <LanguagesBlock data={data} theme={theme} />
        </div>
        <ProjectsBlock data={data} c={c} theme={theme} />
        <ReferencesBlock data={data} c={c} theme={theme} />
      </div>
    </div>
  );
}
