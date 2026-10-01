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

/** Sidebar sombre — colonne foncée avec photo et barres de niveau. Créatifs, marketing. */
export function SidebarTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'bar');
  // Titles on the dark column must stay readable whatever the chosen colors.
  const sideTheme = {
    ...theme,
    primary: '#ffffff',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.7)',
  };
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
        gridTemplateColumns: '35% 65%',
      }}
    >
      <aside style={{ background: c.primaryColor, color: '#ffffff', padding: '2.2rem 1.4rem' }}>
        {c.showPhoto ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <Photo
              url={identity.photoUrl}
              name={identity.fullName}
              size={112}
              borderColor={c.accentColor}
            />
          </div>
        ) : null}
        <ContactList
          identity={identity}
          color="#ffffff"
          iconColor={c.accentColor}
          variant="stacked"
          fontSize="0.74rem"
        />
        <SkillsBlock data={data} c={c} theme={sideTheme} variant="bars" onDark />
        <LanguagesBlock data={data} theme={sideTheme} onDark />
        <CertificationsBlock data={data} c={c} theme={sideTheme} onDark />
      </aside>
      <main style={{ padding: '2.2rem 1.9rem' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: c.headerFont,
            fontSize: '2rem',
            fontWeight: 800,
            color: c.primaryColor,
          }}
        >
          {displayName(identity)}
        </h1>
        {identity.headline ? (
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '1rem',
              fontWeight: 600,
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
        <ReferencesBlock data={data} c={c} theme={theme} />
      </main>
    </div>
  );
}
