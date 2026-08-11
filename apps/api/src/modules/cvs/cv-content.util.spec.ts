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
});
