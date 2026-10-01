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
  hasSection,
} from './blocks';

/** Infographie — jauges de compétences, sections en cartes. Design, communication. */
export function InfographicTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'pill');
  const { identity } = data;
  const hasSkills = hasSection(data, c, 'skills');
  const hasDetails = (['languages', 'education', 'certifications'] as const).some((s) =>
    hasSection(data, c, s)
  );
  const card = {
    background: '#ffffff',
    border: `1px solid ${c.accentColor}33`,
    borderRadius: 12,
    padding: '0.2rem 1rem 1rem',
  };
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
          background: `linear-gradient(120deg, ${c.primaryColor}, ${c.accentColor})`,
          color: '#ffffff',
          padding: '1.8rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {c.showPhoto ? (
          <Photo
            url={identity.photoUrl}
            name={identity.fullName}
            size={96}
            borderColor="rgba(255,255,255,0.25)"
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: c.headerFont, fontSize: '1.9rem', fontWeight: 800 }}>
            {displayName(identity)}
          </h1>
          {identity.headline ? (
            <p style={{ margin: '0.2rem 0 0.7rem', fontSize: '1rem', opacity: 0.95 }}>
              {identity.headline}
            </p>
          ) : null}
          <ContactList identity={identity} color="#ffffff" fontSize="0.74rem" />
        </div>
      </header>
      <div
        style={{
          padding: '0.4rem 1.6rem 1.8rem',
          display: 'grid',
          gridTemplateColumns:
            hasSkills || hasDetails ? 'minmax(0, 62fr) minmax(0, 38fr)' : 'minmax(0, 1fr)',
          columnGap: 16,
        }}
      >
        <main>
          <SummaryBlock data={data} c={c} theme={theme} />
          <ExperienceBlock data={data} c={c} theme={theme} />
          <ProjectsBlock data={data} c={c} theme={theme} />
          <MoreSections data={data} c={c} theme={theme} />
          <ReferencesBlock data={data} c={c} theme={theme} />
        </main>
        <aside>
          {hasSkills ? (
            <div style={{ ...card, marginTop: 'var(--cv-section-gap)' }}>
              <SkillsBlock data={data} c={c} theme={theme} variant="bars" />
            </div>
          ) : null}
          {hasDetails ? (
            <div style={{ ...card, marginTop: 12 }}>
              <LanguagesBlock data={data} theme={theme} />
              <EducationBlock data={data} c={c} theme={theme} />
              <CertificationsBlock data={data} c={c} theme={theme} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
