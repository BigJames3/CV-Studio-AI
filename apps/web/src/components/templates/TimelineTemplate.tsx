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

/** Timeline — expériences sur une frise verticale. Parcours riches. */
export function TimelineTemplate({ data, customization: c }: TemplateProps) {
  const theme = themeFrom(c, 'bar');
  const { identity } = data;
  return (
    <div
      style={{
        ...densityStyle(c.density),
        padding: '2rem 2.2rem',
        minHeight: '100%',
        background: c.backgroundColor,
        color: c.textColor,
        fontFamily: c.bodyFont,
      }}
    >
      <header
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: c.headerFont,
              fontSize: '1.9rem',
              fontWeight: 800,
              color: c.primaryColor,
            }}
          >
            {displayName(identity)}
          </h1>
          {identity.headline ? (
            <p
              style={{
                margin: '0.2rem 0 0.7rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: c.accentColor,
              }}
            >
              {identity.headline}
            </p>
          ) : null}
          <ContactList
            identity={identity}
            color="#374151"
            iconColor={c.accentColor}
            fontSize="0.76rem"
          />
        </div>
        {c.showPhoto ? (
          <Photo
            url={identity.photoUrl}
            name={identity.fullName}
            size={88}
            borderColor={c.accentColor}
          />
        ) : null}
      </header>
      <SummaryBlock data={data} c={c} theme={theme} />
      <ExperienceBlock data={data} c={c} theme={theme} variant="timeline" />
      <EducationBlock data={data} c={c} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
        <div>
          <SkillsBlock data={data} c={c} theme={theme} variant="tags" />
          <LanguagesBlock data={data} theme={theme} />
        </div>
        <div>
          <CertificationsBlock data={data} c={c} theme={theme} />
          <ReferencesBlock data={data} c={c} theme={theme} />
        </div>
      </div>
      <ProjectsBlock data={data} c={c} theme={theme} />
      <MoreSections data={data} c={c} theme={theme} />
    </div>
  );
}
