import { TEMPLATE_SEEDS } from './template-seeds';

describe('TEMPLATE_SEEDS', () => {
  it('gives every template its own id and editor key', () => {
    const ids = TEMPLATE_SEEDS.map((t) => t.id);
    const keys = TEMPLATE_SEEDS.map((t) => t.designData.key);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ships 15 templates: 10 free and 5 premium', () => {
    expect(TEMPLATE_SEEDS).toHaveLength(15);
    expect(
      TEMPLATE_SEEDS.filter((t) => t.isPremium)
        .map((t) => t.designData.key)
        .sort()
    ).toEqual(['elegant', 'executive', 'infographic', 'sidebar', 'timeline']);
  });

  it('keeps categories within the database enum', () => {
    const allowed = ['modern', 'creative', 'executive', 'startup', 'ats_optimized'];
    for (const t of TEMPLATE_SEEDS) expect(allowed).toContain(t.category);
  });

  it('does not invent ratings or downloads for templates nobody has used yet', () => {
    const fresh = TEMPLATE_SEEDS.filter((t) => Number(t.id.slice(-2)) > 5);
    expect(fresh).toHaveLength(10);
    for (const t of fresh) {
      expect(t.rating).toBe(0);
      expect(t.downloadCount).toBe(0);
    }
  });
});
