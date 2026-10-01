import {
  careerAdviceHeuristic,
  extractCvFacts,
  extractKeywords,
  interviewPrepHeuristic,
  matchJobHeuristic,
  optimizeResumeHeuristic,
  resolveProviderMode,
  runAiFeature,
  skillsSuggestHeuristic,
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

  it('cover letter cites the roles of a saved CV (CvContent uses experiences)', async () => {
    const response = await runAiFeature({
      feature: 'cover-letter',
      userId: 'u1',
      payload: {
        jobDescription: 'React role',
        company: 'Wave',
        cvFacts: {
          identity: { fullName: 'Awa Diallo' },
          experiences: [{ title: 'Frontend Engineer', company: 'Orange', bullets: [] }],
          skills: [{ name: 'React' }],
        },
      },
    });
    const data = response.data as { usedEvidence: string[]; warnings: string[] };
    expect(data.usedEvidence).toEqual(['Frontend Engineer at Orange', 'React']);
    expect(data.warnings).toEqual([]);
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
      feature: 'grammar-check',
      userId: 'u1',
      payload: {},
    });
    expect(response.ok).toBe(false);
    expect(response.error).toContain('not wired yet');
  });
});

const CV = {
  identity: { fullName: 'Awa Diallo', headline: 'Frontend Engineer' },
  summary: { text: 'Frontend engineer building React apps.' },
  experiences: [
    {
      title: 'Frontend Engineer',
      company: 'Orange',
      bullets: [
        'Built a design system in React and TypeScript used by 12 teams',
        'Set up Playwright end-to-end tests in CI/CD',
      ],
    },
    {
      title: 'Web Developer',
      company: 'Wave',
      bullets: ['Built payment pages with Next.js', 'Worked with the rest of the team on releases'],
    },
  ],
  skills: [{ name: 'React' }, { name: 'JavaScript' }],
  projects: [{ name: 'Portfolio', description: 'Personal site with Tailwind' }],
  certificates: [],
  education: [],
};
const JD =
  'Senior Frontend Engineer. Required: React, TypeScript, GraphQL and accessibility. ' +
  'Nice to have: Storybook, Figma.';

describe('@cvstudio/ai-service CV facts', () => {
  it('reads CvContent (experiences) and the legacy experience key', () => {
    expect(extractCvFacts(CV).experiences).toHaveLength(2);
    const legacy = extractCvFacts({ experience: [{ position: 'Dev', company: 'Acme' }] });
    expect(legacy.experiences[0]).toMatchObject({ title: 'Dev', company: 'Acme' });
    expect(extractCvFacts(null).text).toBe('');
  });

  it('drops stopwords, seniority words and numbers from keywords', () => {
    expect(extractKeywords('Senior engineer with 5 years of React and SQL')).toEqual([
      'react',
      'sql',
    ]);
  });
});

describe('@cvstudio/ai-service job matcher (AI-001)', () => {
  it('scores weighted coverage and quotes evidence from the CV', () => {
    const result = matchJobHeuristic({ cvFacts: CV, jobDescription: JD });
    expect(result.ok).toBe(true);
    expect(result.matchScore).toBeGreaterThan(0);
    expect(result.matchScore).toBeLessThan(100);
    expect(result.strengths).toContainEqual({
      keyword: 'typescript',
      evidence: expect.stringContaining('Frontend Engineer at Orange'),
    });
    expect(result.mustHaveGaps.map((g) => g.requirement)).toEqual(
      expect.arrayContaining(['graphql', 'accessibility'])
    );
    expect(result.niceToHaveGaps.map((g) => g.requirement)).toContain('figma');
    expect(result.mustHaveGaps.map((g) => g.requirement)).not.toContain('senior');
  });

  it('suggests naming a listed skill in a bullet, never adding a missing one', () => {
    const cv = { ...CV, skills: [{ name: 'Docker' }] };
    const result = matchJobHeuristic({ cvFacts: cv, jobDescription: 'Required: Docker, Rust' });
    expect(result.suggestedEdits[0]?.suggestion).toContain('docker');
    expect(JSON.stringify(result.suggestedEdits)).not.toContain('rust');
  });

  it('refuses a job description without keywords', () => {
    const result = matchJobHeuristic({ cvFacts: CV, jobDescription: 'the and with' });
    expect(result).toMatchObject({ ok: false, matchScore: 0 });
    expect(result.refusals[0]).toMatch(/no usable keywords/);
  });
});

describe('@cvstudio/ai-service interview prep (AI-001)', () => {
  it('asks about named skills from the CV and flags the ones it lacks', () => {
    const result = interviewPrepHeuristic({
      cvFacts: CV,
      jobDescription: JD,
      interviewType: 'technical',
    });
    const asked = result.questions.map((q) => q.question).join('\n');
    expect(result.interviewType).toBe('technical');
    expect(asked).toContain('How have you used TypeScript');
    expect(asked).not.toMatch(/used (senior|engineer)/i);
    const graphql = result.questions.find((q) => q.question.includes('GraphQL'));
    expect(graphql?.needsUserInput).toBe(true);
  });

  it('builds hiring manager questions from the CV roles', () => {
    const result = interviewPrepHeuristic({
      cvFacts: CV,
      jobDescription: JD,
      interviewType: 'hiring_manager',
    });
    expect(result.questions[0]?.question).toContain('Frontend Engineer at Orange');
  });

  it('defaults to HR and warns when the CV has no experience', () => {
    const result = interviewPrepHeuristic({ cvFacts: {}, jobDescription: JD });
    expect(result.interviewType).toBe('hr');
    expect(result.questions[0]?.needsUserInput).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('refuses an empty job description', () => {
    expect(interviewPrepHeuristic({ cvFacts: CV, jobDescription: '  ' }).ok).toBe(false);
  });
});

describe('@cvstudio/ai-service career advice (AI-001)', () => {
  it('derives each card from a check on the CV', () => {
    const types = careerAdviceHeuristic({ cvFacts: CV }).cards.map((c) => c.type);
    expect(types).toEqual(['summary', 'impact', 'skills', 'next-step']);
  });

  it('flags an empty CV and an off-target positioning', () => {
    const cards = careerAdviceHeuristic({ cvFacts: {}, targetRole: 'Data Scientist' }).cards;
    expect(cards.map((c) => c.type)).toEqual([
      'experience',
      'summary',
      'skills',
      'positioning',
      'credibility',
      'next-step',
    ]);
    expect(cards.find((c) => c.type === 'positioning')?.title).toContain('Data Scientist');
  });

  it('asks for a headline when there is no target role', () => {
    const cv = { ...CV, identity: { fullName: 'Awa' } };
    const types = careerAdviceHeuristic({ cvFacts: cv }).cards.map((c) => c.type);
    expect(types).toContain('positioning');
  });
});

describe('@cvstudio/ai-service skills suggestions (AI-001)', () => {
  it('suggests only unlisted skills the CV demonstrates, with their evidence', () => {
    const result = skillsSuggestHeuristic({ cvFacts: CV, targetRole: 'Frontend developer' });
    const skills = result.suggestions.map((s) => s.skill);
    expect(skills).toEqual(expect.arrayContaining(['TypeScript', 'Next.js', 'Tailwind']));
    expect(skills).not.toContain('React');
    expect(result.suggestions[0]).toMatchObject({ skill: 'TypeScript', relevantToTarget: true });
    expect(result.suggestions.find((s) => s.skill === 'Tailwind')?.source).toBe('project');
  });

  it('does not read ordinary words as skills', () => {
    const skills = skillsSuggestHeuristic({ cvFacts: CV }).suggestions.map((s) => s.skill);
    expect(skills).not.toContain('REST');
  });

  it('lists expected skills with no evidence under toDevelop, not suggestions', () => {
    const result = skillsSuggestHeuristic({ cvFacts: CV, targetRole: 'Frontend developer' });
    expect(result.toDevelop.map((s) => s.skill)).toContain('Accessibility');
    expect(result.suggestions.map((s) => s.skill)).not.toContain('Accessibility');
  });

  it('warns on an unknown role and on a CV with nothing to suggest', () => {
    const result = skillsSuggestHeuristic({ cvFacts: {}, targetRole: 'Astronaut' });
    expect(result.warnings).toHaveLength(2);
  });
});

describe('@cvstudio/ai-service gateway routes CV insights (AI-001)', () => {
  it.each([
    ['job-match', { jobDescription: JD }],
    ['interview', { jobDescription: JD, interviewType: 'hr' }],
    ['career-advice', { targetRole: 'Frontend developer' }],
    ['skills-suggest', {}],
  ] as const)('%s completes via heuristic', async (feature, input) => {
    const response = await runAiFeature({
      feature,
      userId: 'u1',
      payload: { ...input, cvFacts: CV },
    });
    expect(response).toMatchObject({ ok: true, provider: 'heuristic', model: 'heuristic-v1' });
  });

  it('returns the refusal as the error', async () => {
    const response = await runAiFeature({
      feature: 'job-match',
      userId: 'u1',
      payload: { cvFacts: 'not an object', jobDescription: 42 },
    });
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/no usable keywords/);
  });
});
