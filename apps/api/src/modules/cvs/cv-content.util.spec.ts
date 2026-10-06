import { EMPTY_CV_CONTENT, normalizeCvContent } from './cv-content.util';

describe('normalizeCvContent', () => {
  it('returns empty flat content for null', () => {
    expect(normalizeCvContent(null)).toMatchObject({
      schemaVersion: 1,
      identity: { fullName: '' },
      experiences: [],
    });
  });

  it('unwraps legacy sections wrapper', () => {
    const normalized = normalizeCvContent({
      schemaVersion: 1,
      sections: {
        identity: { fullName: 'Ada' },
        summary: { text: 'Hi' },
        experiences: [{ id: '1' }],
        education: [],
        skills: [],
        languages: [],
        projects: [],
        certificates: [],
        references: [],
      },
    });

    expect(normalized.identity.fullName).toBe('Ada');
    expect(normalized.summary.text).toBe('Hi');
    expect(normalized.experiences).toHaveLength(1);
    expect((normalized as { sections?: unknown }).sections).toBeUndefined();
  });

  it('passes through flat content', () => {
    const flat = {
      ...EMPTY_CV_CONTENT,
      identity: { fullName: 'Grace' },
    };
    expect(normalizeCvContent(flat).identity.fullName).toBe('Grace');
  });

  it('keeps the optional « modèle universel » sections and extras', () => {
    const normalized = normalizeCvContent({
      ...EMPTY_CV_CONTENT,
      identity: { fullName: 'Ada', country: 'Côte d’Ivoire' },
      awards: [{ id: 'a1', name: 'Prix du meilleur projet' }],
      volunteering: [{ id: 'v1', organization: 'Croix-Rouge' }],
      publications: [{ id: 'p1', title: 'Article' }],
      talks: [{ id: 't1', event: 'Conférence cybersécurité' }],
      licenses: [{ id: 'l1', name: 'Permis B' }],
      interests: [{ id: 'i1', name: 'Photographie' }],
      additionalInfo: [{ id: 'x1', label: 'Ordre', value: 'N° 123' }],
      extras: { availability: 'Disponible immédiatement', mobility: ['Télétravail'] },
    });

    expect(normalized.identity.country).toBe('Côte d’Ivoire');
    expect(normalized.awards).toHaveLength(1);
    expect(normalized.volunteering).toHaveLength(1);
    expect(normalized.publications).toHaveLength(1);
    expect(normalized.talks).toHaveLength(1);
    expect(normalized.licenses).toHaveLength(1);
    expect(normalized.interests).toHaveLength(1);
    expect(normalized.additionalInfo).toHaveLength(1);
    expect(normalized.extras).toEqual({
      availability: 'Disponible immédiatement',
      mobility: ['Télétravail'],
    });
  });

  it('defaults the optional sections for older CVs and rejects malformed values', () => {
    const normalized = normalizeCvContent({
      ...EMPTY_CV_CONTENT,
      awards: undefined,
      interests: 'Lecture',
      extras: ['not', 'an', 'object'],
    });

    expect(normalized.awards).toEqual([]);
    expect(normalized.interests).toEqual([]);
    expect(normalized.extras).toEqual({});
    expect(normalizeCvContent(null).additionalInfo).toEqual([]);
  });
});
