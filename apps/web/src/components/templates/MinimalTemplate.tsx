import type { TemplateProps } from './shared';
import { densityStyle } from './shared';
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

/** Minimal — noir et blanc, beaucoup d'espace, titres de section en marge. Tous profils. */
export function MinimalTemplate({ data, customization: c }: TemplateProps) {
  const theme = { ...themeFrom(c, 'caps', '#6b7280'), sideLabels: true };
  const { identity } = data;
  return (
    <div
      style={{
        ...densityStyle(c.density),
        padding: '2.6rem 2.6rem',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header style={{ marginBottom: '0.6rem' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: c.headerFont,
            fontSize: '2.4rem',
            fontWeight: 300,
            letterSpacing: '-0.01em',
            color: c.primaryColor,
          }}
        >
          {displayName(identity)}
        </h1>
        {identity.headline ? (
          <p style={{ margin: '0.3rem 0 0.8rem', fontSize: '1rem', color: '#4b5563' }}>
            {identity.headline}
          </p>
        ) : null}
        <ContactList identity={identity} color="#4b5563" icons={false} fontSize="0.76rem" />
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
