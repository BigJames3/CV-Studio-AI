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

/** Élégant — empattements, filets dorés, colonne ivoire. Cadres, luxe, conseil. */
export function ElegantTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'serif', '#57534e');
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
        gridTemplateColumns: '34% 66%',
      }}
    >
      <aside
        style={{
          background: '#faf7f2',
          padding: '2.2rem 1.4rem',
          borderRight: `1px solid ${c.accentColor}`,
        }}
      >
        {c.showPhoto ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <Photo
              url={identity.photoUrl}
              name={identity.fullName}
              size={104}
              borderColor={c.accentColor}
            />
          </div>
        ) : null}
        <ContactList
          identity={identity}
          color="#44403c"
          iconColor={c.accentColor}
          variant="stacked"
          fontSize="0.74rem"
        />
        <SkillsBlock data={data} c={c} theme={theme} variant="dots" />
        <LanguagesBlock data={data} theme={theme} />
        <CertificationsBlock data={data} c={c} theme={theme} />
      </aside>
      <main style={{ padding: '2.4rem 2rem' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: c.headerFont,
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
            color: c.primaryColor,
          }}
        >
          {displayName(identity)}
        </h1>
        {identity.headline ? (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.82rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: c.accentColor,
            }}
          >
            {identity.headline}
          </p>
        ) : null}
        <SummaryBlock data={data} c={c} theme={theme} />
        <ExperienceBlock data={data} c={c} theme={theme} />
        <EducationBlock data={data} c={c} theme={theme} />
        <ProjectsBlock data={data} c={c} theme={theme} />
        <MoreSections data={data} c={c} theme={theme} />
        <ReferencesBlock data={data} c={c} theme={theme} />
      </main>
    </div>
  );
}
