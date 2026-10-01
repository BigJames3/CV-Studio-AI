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
  hasSection,
  themeFrom,
} from './blocks';

/** Bandeau — grand bandeau coloré avec photo, puis 2 colonnes. Commercial, relation client. */
export function BannerTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'bar');
  const hasAside = (['skills', 'languages', 'certifications', 'references'] as const).some((s) =>
    hasSection(data, c, s)
  );
  const { identity } = data;
  return (
    <div
      style={{
        ...densityStyle(c.density),
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header
        style={{
          background: c.primaryColor,
          color: '#ffffff',
          padding: '1.8rem 2.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {c.showPhoto ? (
          <Photo
            url={identity.photoUrl}
            name={identity.fullName}
            size={92}
            borderColor={c.accentColor}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: c.headerFont, fontSize: '1.9rem', fontWeight: 700 }}>
            {displayName(identity)}
          </h1>
          {identity.headline ? (
            <p
              style={{
                margin: '0.25rem 0 0.7rem',
                fontSize: '1rem',
                color: c.accentColor,
                fontWeight: 600,
              }}
            >
              {identity.headline}
            </p>
          ) : null}
          <ContactList identity={identity} color="#ffffff" iconColor={c.accentColor} />
        </div>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasAside ? 'minmax(0, 64fr) minmax(0, 36fr)' : 'minmax(0, 1fr)',
        }}
      >
        <main style={{ padding: '0.4rem 1.4rem 2rem 2.2rem' }}>
          <SummaryBlock data={data} c={c} theme={theme} />
          <ExperienceBlock data={data} c={c} theme={theme} />
          <EducationBlock data={data} c={c} theme={theme} />
          <ProjectsBlock data={data} c={c} theme={theme} />
        </main>
        <aside style={{ padding: '0.4rem 2rem 2rem 0.6rem' }}>
          <SkillsBlock data={data} c={c} theme={theme} variant="tags" />
          <LanguagesBlock data={data} theme={theme} />
          <CertificationsBlock data={data} c={c} theme={theme} />
          <ReferencesBlock data={data} c={c} theme={theme} />
        </aside>
      </div>
    </div>
  );
}
