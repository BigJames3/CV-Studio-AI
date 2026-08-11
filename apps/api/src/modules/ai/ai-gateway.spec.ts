import {
  optimizeResumeHeuristic,
  resolveProviderMode,
  runAiFeature,
} from '@cvstudio/ai-service';

describe('@cvstudio/ai-service optimize-resume gateway', () => {
  it('strengthens weak verbs without inventing metrics', () => {
    const result = optimizeResumeHeuristic({
      bulletText: 'Helped build an internal design system with React',
      tone: 'factual',
      jobDescription: 'React TypeScript design systems GraphQL',
    });

    expect(result.ok).toBe(true);
    expect(result.variants).toHaveLength(3);
    expect(result.variants[0]?.text.startsWith('Supported')).toBe(true);
    expect(result.variants.every((v) => !/\d{2,}/.test(v.text) || v.text.includes('React'))).toBe(
      true
    );
    expect(result.variants[2]?.atsNotes).toMatch(/react|design/i);
  });

  it('refuses empty bullet text', () => {
    const result = optimizeResumeHeuristic({ bulletText: '   ' });
    expect(result.ok).toBe(false);
    expect(result.refusals).toContain('bulletText is required');
  });

  it('resolves heuristic provider when no API key is set', () => {
    expect(resolveProviderMode({ AI_PROVIDER: undefined, OPENAI_API_KEY: undefined })).toBe(
      'heuristic'
    );
    expect(resolveProviderMode({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk' })).toBe('openai');
  });

  it('runAiFeature completes optimize-resume via heuristic', async () => {
    process.env.AI_PROVIDER = 'heuristic';
    const response = await runAiFeature({
      feature: 'optimize-resume',
      userId: 'u1',
      payload: { bulletText: 'Worked on payment webhooks' },
    });

    expect(response.ok).toBe(true);
    expect(response.provider).toBe('heuristic');
    expect(response.model).toBe('heuristic-v1');
  });

  it('runAiFeature completes cover-letter via heuristic', async () => {
    process.env.AI_PROVIDER = 'heuristic';
    const response = await runAiFeature({
      feature: 'cover-letter',
      userId: 'u1',
      payload: {
        jobDescription: 'Senior engineer with React and TypeScript',
        company: 'Acme',
        cvFacts: {
          identity: { fullName: 'Ada Lovelace' },
          experience: [{ position: 'Engineer', company: 'Past Co' }],
          skills: [{ name: 'React' }],
        },
      },
    });
    expect(response.ok).toBe(true);
    expect(response.provider).toBe('heuristic');
    const data = response.data as { letter: { body: string } };
    expect(data.letter.body).toContain('Dear Hiring Manager');
  });

  it('runAiFeature completes ats explain via heuristic', async () => {
    const response = await runAiFeature({
      feature: 'ats',
      userId: 'u1',
      payload: {
        score: 62,
        breakdown: { missingKeywords: ['kubernetes'] },
        cvSummary: { hasExperience: true },
        hasJd: true,
      },
    });
    expect(response.ok).toBe(true);
    const data = response.data as { headline: string; quickWins: string[] };
    expect(data.headline).toBeTruthy();
    expect(data.quickWins.length).toBeGreaterThan(0);
  });

  it('runAiFeature reports unwired features clearly', async () => {
    const response = await runAiFeature({
      feature: 'interview',
      userId: 'u1',
      payload: {},
    });
    expect(response.ok).toBe(false);
    expect(response.error).toContain('not wired yet');
  });
});
