import type { ExportPdfOptions, PdfCvContent } from './pdf-content.types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRange(start?: string, end?: string | null, current?: boolean): string {
  const s = start?.trim() || '';
  if (!s && !end && !current) return '';
  const e = current || !end ? 'Present' : String(end);
  return s ? `${escapeHtml(s)} – ${escapeHtml(e)}` : escapeHtml(e);
}

export function buildPdfHtml(
  cv: PdfCvContent,
  options: ExportPdfOptions & { title?: string } = {}
): string {
  const c = cv.customization ?? {};
  const primary = c.primaryColor ?? '#2563eb';
  const text = c.textColor ?? '#1e293b';
  const bg = c.backgroundColor ?? '#ffffff';
  const showPhoto = c.showPhoto !== false && Boolean(cv.identity.photoUrl);
  const showSummary = c.showSummary !== false;
  const showExperience = c.showExperience !== false;
  const showEducation = c.showEducation !== false;
  const showSkills = c.showSkills !== false;
  const showProjects = c.showProjects !== false;
  const showCertificates = c.showCertificates !== false;

  const name = escapeHtml(cv.identity.fullName || 'CV');
  const contactBits = [
    cv.identity.email,
    cv.identity.phone,
    cv.identity.city,
    cv.identity.linkedin,
    cv.identity.website,
  ]
    .filter(Boolean)
    .map((v) => escapeHtml(String(v)));

  const sections: string[] = [];
  const tocItems: Array<{ id: string; label: string }> = [];

  if (showSummary && cv.summary?.text?.trim()) {
    tocItems.push({ id: 'summary', label: 'Summary' });
    sections.push(`
      <section class="cv-section" id="summary">
        <h2>Professional Summary</h2>
        <p>${escapeHtml(cv.summary.text)}</p>
      </section>`);
  }

  if (showExperience && cv.experiences?.length) {
    tocItems.push({ id: 'experience', label: 'Experience' });
    sections.push(`
      <section class="cv-section" id="experience">
        <h2>Experience</h2>
        ${cv.experiences
          .map(
            (exp) => `
          <article class="cv-item">
            <h3>${escapeHtml(exp.title)}</h3>
            <div class="meta">${escapeHtml(exp.company)}${exp.location ? ` · ${escapeHtml(exp.location)}` : ''}</div>
            <div class="meta">${formatRange(exp.start, exp.end, exp.current)}</div>
            ${
              exp.bullets?.length
                ? `<ul>${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
                : exp.description
                  ? `<p class="description">${escapeHtml(exp.description)}</p>`
                  : ''
            }
          </article>`
          )
          .join('')}
      </section>`);
  }

  if (showEducation && cv.education?.length) {
    tocItems.push({ id: 'education', label: 'Education' });
    sections.push(`
      <section class="cv-section" id="education">
        <h2>Education</h2>
        ${cv.education
          .map(
            (edu) => `
          <article class="cv-item">
            <h3>${escapeHtml(edu.degree)}${edu.field ? ` in ${escapeHtml(edu.field)}` : ''}</h3>
            <div class="meta">${escapeHtml(edu.school)}</div>
            <div class="meta">${formatRange(edu.start, edu.end)}</div>
            ${edu.details ? `<p class="description">${escapeHtml(edu.details)}</p>` : ''}
          </article>`
          )
          .join('')}
      </section>`);
  }

  if (showSkills && cv.skills?.length) {
    tocItems.push({ id: 'skills', label: 'Skills' });
    sections.push(`
      <section class="cv-section" id="skills">
        <h2>Skills</h2>
        <div class="skills-list">
          ${cv.skills
            .map(
              (s) =>
                `<span class="skill-tag">${escapeHtml(s.name)}${s.level != null ? ` (${escapeHtml(String(s.level))})` : ''}</span>`
            )
            .join('')}
        </div>
      </section>`);
  }

  if (showProjects && cv.projects?.length) {
    tocItems.push({ id: 'projects', label: 'Projects' });
    sections.push(`
      <section class="cv-section" id="projects">
        <h2>Projects</h2>
        ${cv.projects
          .map(
            (p) => `
          <article class="cv-item">
            <h3>${escapeHtml(p.name)}</h3>
            ${p.description ? `<p class="description">${escapeHtml(p.description)}</p>` : ''}
            ${p.url ? `<p class="meta"><a href="${escapeHtml(p.url)}">${escapeHtml(p.url)}</a></p>` : ''}
          </article>`
          )
          .join('')}
      </section>`);
  }

  if (showCertificates && cv.certificates?.length) {
    tocItems.push({ id: 'certificates', label: 'Certifications' });
    sections.push(`
      <section class="cv-section" id="certificates">
        <h2>Certifications</h2>
        ${cv.certificates
          .map(
            (cert) => `
          <article class="cv-item">
            <h3>${escapeHtml(cert.name)}</h3>
            <div class="meta">${[cert.issuer, cert.year].filter(Boolean).map((x) => escapeHtml(String(x))).join(' · ')}</div>
          </article>`
          )
          .join('')}
      </section>`);
  }

  if (cv.languages?.length) {
    tocItems.push({ id: 'languages', label: 'Languages' });
    sections.push(`
      <section class="cv-section" id="languages">
        <h2>Languages</h2>
        <ul class="lang-list">
          ${cv.languages
            .map(
              (l) =>
                `<li>${escapeHtml(l.name)}${l.level ? ` — ${escapeHtml(l.level)}` : ''}</li>`
            )
            .join('')}
        </ul>
      </section>`);
  }

  const longCv = tocItems.length >= 5 || (cv.experiences?.length ?? 0) >= 6;
  const toc =
    longCv && tocItems.length
      ? `
      <nav class="toc cv-section" id="toc">
        <h2>Contents</h2>
        <ol>${tocItems.map((t) => `<li><a href="#${t.id}">${escapeHtml(t.label)}</a></li>`).join('')}</ol>
      </nav>`
      : '';

  const pageSize = options.pageSize ?? 'A4';
  const margin = options.marginMm ?? 12;
  const siteUrl = options.siteUrl ? escapeHtml(options.siteUrl) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(options.title || cv.identity.fullName || 'CV')}</title>
  <style>
    ${printCss({ primary, text, bg, pageSize, margin, includeHeader: options.includeHeader !== false })}
  </style>
</head>
<body>
  ${
    options.includeHeader !== false
      ? `<header class="running-header">
          <span class="rh-name">${name}</span>
          ${siteUrl ? `<span class="rh-url">${siteUrl}</span>` : ''}
        </header>`
      : ''
  }
  <main class="cv-content">
    <section class="cv-hero">
      ${
        showPhoto
          ? `<img class="profile-photo" src="${escapeHtml(cv.identity.photoUrl!)}" alt="" />`
          : ''
      }
      <h1>${name}</h1>
      ${cv.identity.headline ? `<p class="headline">${escapeHtml(cv.identity.headline)}</p>` : ''}
      ${contactBits.length ? `<p class="contact">${contactBits.join(' · ')}</p>` : ''}
    </section>
    ${toc}
    ${sections.join('\n')}
  </main>
  ${
    options.includeFooter !== false
      ? `<footer class="doc-footer">
          <span>${new Date().getFullYear()} — ${name}</span>
          ${siteUrl ? `<span>${siteUrl}</span>` : ''}
        </footer>`
      : ''
  }
</body>
</html>`;
}

function printCss(opts: {
  primary: string;
  text: string;
  bg: string;
  pageSize: string;
  margin: number;
  includeHeader: boolean;
}): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: ${opts.text};
      background: ${opts.bg};
      font-size: 10.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: ${opts.pageSize};
      margin: ${opts.includeHeader ? opts.margin + 8 : opts.margin}mm ${opts.margin}mm ${opts.margin + 10}mm;
    }
    .running-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid ${opts.primary};
      padding-bottom: 6px;
      margin-bottom: 14px;
      font-size: 8.5pt;
      color: #64748b;
    }
    .rh-name { font-weight: 600; color: ${opts.primary}; }
    .cv-hero { text-align: center; margin-bottom: 18px; page-break-inside: avoid; }
    .cv-hero h1 {
      font-size: 22pt;
      color: ${opts.primary};
      letter-spacing: -0.02em;
      margin: 6px 0 4px;
    }
    .headline { font-size: 11pt; color: #475569; margin-bottom: 4px; }
    .contact { font-size: 9pt; color: #64748b; }
    .profile-photo {
      width: 72px; height: 72px; border-radius: 50%;
      object-fit: cover; border: 2px solid ${opts.primary};
    }
    .cv-section { margin-bottom: 16px; page-break-inside: avoid; }
    .cv-section h2 {
      font-size: 12pt;
      color: ${opts.primary};
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    .cv-item { margin-bottom: 12px; page-break-inside: avoid; }
    .cv-item h3 { font-size: 11pt; page-break-after: avoid; }
    .meta { font-size: 9pt; color: #64748b; margin: 2px 0; }
    .description { font-size: 10pt; margin-top: 4px; }
    ul { margin: 4px 0 0 1.1em; }
    li { margin-bottom: 2px; }
    a { color: ${opts.primary}; text-decoration: none; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tag {
      background: ${opts.primary}18;
      color: ${opts.primary};
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9pt;
    }
    .toc ol { margin-left: 1.2em; }
    .toc a { color: #475569; }
    .lang-list { list-style: none; margin-left: 0; }
    .doc-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    img { max-width: 100%; height: auto; }
  `;
}

export function suggestFilename(cv: PdfCvContent, custom?: string): string {
  if (custom?.trim()) {
    const base = custom.trim().replace(/\.pdf$/i, '');
    return `${sanitizeFilename(base)}.pdf`;
  }
  const name = cv.identity.fullName?.trim() || 'CV';
  const parts = name.split(/\s+/).filter(Boolean);
  const slug = parts.length >= 2 ? `${parts[0]}_${parts[parts.length - 1]}_CV` : `${name}_CV`;
  return `${sanitizeFilename(slug)}.pdf`;
}

function sanitizeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}
