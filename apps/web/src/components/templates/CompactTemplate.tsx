import type { TemplateProps } from './shared';
import { densityStyle } from './shared';
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
  hasSection,
  themeFrom,
} from './blocks';

/** Compact — 2 colonnes serrées pour tenir sur une page. Profils expérimentés. */
export function CompactTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'rule');
  const hasAside = (
    ['skills', 'education', 'certifications', 'languages', 'references'] as const
  ).some((s) => hasSection(data, c, s));
  const { identity } = data;
  return (
    <div
      style={{
        ...densityStyle(c.density),
        fontSize: `calc(${densityStyle(c.density).fontSize} * 0.94)`,
        padding: '1.6rem 1.8rem',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          borderBottom: `3px solid ${c.primaryColor}`,
          paddingBottom: 10,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: c.headerFont,
              fontSize: '1.6rem',
              fontWeight: 800,
              color: c.primaryColor,
            }}
          >
            {displayName(identity)}
          </h1>
          {identity.headline ? (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.92rem', fontWeight: 600 }}>
              {identity.headline}
            </p>
          ) : null}
        </div>
        <div style={{ maxWidth: '45%' }}>
          <ContactList
            identity={identity}
            color="#374151"
            iconColor={c.primaryColor}
            variant="stacked"
            fontSize="0.72rem"
          />
        </div>
      </header>
      <SummaryBlock data={data} c={c} theme={theme} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasAside ? 'minmax(0, 63fr) minmax(0, 37fr)' : 'minmax(0, 1fr)',
          columnGap: 20,
        }}
      >
        <main>
          <ExperienceBlock data={data} c={c} theme={theme} variant="compact" />
          <ProjectsBlock data={data} c={c} theme={theme} />
        </main>
        <aside>
          <SkillsBlock data={data} c={c} theme={theme} />
          <EducationBlock data={data} c={c} theme={theme} />
          <CertificationsBlock data={data} c={c} theme={theme} />
          <LanguagesBlock data={data} theme={theme} />
          <ReferencesBlock data={data} c={c} theme={theme} />
        </aside>
      </div>
    </div>
  );
}
