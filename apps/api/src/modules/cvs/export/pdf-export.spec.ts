import { createHash } from 'crypto';
import { normalizeCvContent } from './normalize-cv-content';
import { validateCvForExport } from './validate-cv-for-export';
import { suggestFilename, buildPdfHtml } from './pdf-html.builder';

describe('normalizeCvContent', () => {
  it('flattens sections wrapper', () => {
    const cv = normalizeCvContent({
      schemaVersion: 1,
      sections: {
        identity: { fullName: 'Ada Lovelace', email: 'ada@example.com' },
        summary: { text: 'Math' },
        experiences: [],
        education: [],
        skills: [],
        languages: [],
        projects: [],
        certificates: [],
      },
    });
    expect(cv.identity.fullName).toBe('Ada Lovelace');
    expect(cv.identity.email).toBe('ada@example.com');
    expect(cv.summary?.text).toBe('Math');
  });

  it('maps personalInfo legacy shape', () => {
    const cv = normalizeCvContent({
      personalInfo: { firstName: 'Grace', lastName: 'Hopper', email: 'grace@navy.mil' },
      experiences: [],
    });
    expect(cv.identity.fullName).toBe('Grace Hopper');
  });
});

describe('validateCvForExport', () => {
  it('requires name and email', () => {
    const result = validateCvForExport({
      identity: { fullName: '', email: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining(['Full name is required', 'Email is required'])
    );
  });

  it('passes with warnings when sparse', () => {
    const result = validateCvForExport({
      identity: { fullName: 'Test User', email: 't@example.com' },
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('suggestFilename', () => {
  it('builds Prenom_Nom_CV.pdf', () => {
    expect(
      suggestFilename({ identity: { fullName: 'Alex Martin', email: 'a@b.c' } })
    ).toBe('Alex_Martin_CV.pdf');
  });

  it('respects custom filename', () => {
    expect(
      suggestFilename({ identity: { fullName: 'Alex' } }, 'My Custom.pdf')
    ).toBe('My_Custom.pdf');
  });
});

describe('buildPdfHtml', () => {
  it('includes toc for long CVs', () => {
    const experiences = Array.from({ length: 6 }, (_, i) => ({
      company: `Co ${i}`,
      title: `Role ${i}`,
      start: '2020',
      bullets: ['Did things'],
    }));
    const html = buildPdfHtml({
      identity: { fullName: 'Long CV', email: 'l@e.com', headline: 'Eng' },
      summary: { text: 'Summary text' },
      experiences,
      education: [{ school: 'Uni', degree: 'MSc' }],
      skills: [{ name: 'TS' }],
      languages: [{ name: 'FR' }],
      projects: [{ name: 'P1' }],
      certificates: [{ name: 'C1' }],
    });
    expect(html).toContain('class="toc');
    expect(html).toContain('Professional Summary');
    expect(createHash('sha256').update(html).digest('hex')).toHaveLength(64);
  });
});
