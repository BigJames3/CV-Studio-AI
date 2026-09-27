import {
  applyEdits,
  careerAdviceHeuristic,
  detectLanguage,
  grammarCheckHeuristic,
  grammarCheckWithOpenAi,
  optimizeResumeWithOpenAi,
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
      feature: 'linkedin-import',
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

describe('@cvstudio/ai-service grammar check rules (AI-001 step 2)', () => {
  const NBSP = '\u00a0';

  it('detects French and English, honouring an explicit locale', () => {
    expect(detectLanguage('Chef de projet à Dakar')).toBe('fr');
    expect(detectLanguage('I led the team')).toBe('en');
    expect(detectLanguage('I led the team', 'fr-FR')).toBe('fr');
    expect(detectLanguage('J’ai dirigé', 'en-US')).toBe('en');
  });

  it('fixes spacing, repeated words, capitals and French typography', () => {
    const result = grammarCheckHeuristic({
      text: "j'ai  dirigé une équipe. nous nous sommes concentrés sur la la qualité: résultats !",
    });
    expect(result).toMatchObject({ ok: true, language: 'fr' });
    expect(result.correctedText).toBe(
      `J'ai dirigé une équipe. Nous nous sommes concentrés sur la qualité${NBSP}: résultats${NBSP}!`
    );
    expect(result.edits.map((e) => e.rule)).toEqual([
      'capitalization',
      'whitespace',
      'capitalization',
      'repeated-word',
      'fr-space-before-punctuation',
      'fr-space-before-punctuation',
    ]);
    expect(result.warnings[0]).toMatch(/spelling is not verified/);
  });

  it('adds French non-breaking spaces inside « » quotes', () => {
    expect(
      grammarCheckHeuristic({ text: 'Projet «Atlas» livré', locale: 'fr' }).correctedText
    ).toBe(`Projet «${NBSP}Atlas${NBSP}» livré`);
  });

  it('leaves times, URLs, decimals and abbreviations alone', () => {
    const text = 'Réunion à 12:30 via https://acme.fr et 1,5 an de projet, e.g. suivi.';
    expect(grammarCheckHeuristic({ text }).correctedText).toBe(text);
  });

  it('fixes English punctuation spacing and a missing space after a comma', () => {
    const result = grammarCheckHeuristic({ text: 'i led 5 engineers ,shipped the the app !' });
    expect(result.language).toBe('en');
    expect(result.correctedText).toBe('I led 5 engineers, shipped the app!');
  });

  it('keeps the first of two overlapping edits', () => {
    const { edits, correctedText } = applyEdits('abcd', [
      { offset: 1, original: 'bc', replacement: 'X', rule: 'a', message: '' },
      { offset: 2, original: 'cd', replacement: 'Y', rule: 'b', message: '' },
      { offset: 0, original: 'a', replacement: 'a', rule: 'noop', message: '' },
    ]);
    expect(edits.map((e) => e.rule)).toEqual(['a']);
    expect(correctedText).toBe('aXd');
  });

  it('refuses empty text', () => {
    expect(grammarCheckHeuristic({ text: '  ' })).toMatchObject({
      ok: false,
      refusals: ['text is required'],
    });
  });
});

describe('@cvstudio/ai-service grammar check with OpenAI (AI-001 step 2)', () => {
  const env = { OPENAI_API_KEY: 'sk-test' };
  const reply = (content: unknown, ok = true) =>
    jest.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      text: async () => 'server error',
      json: async () => ({
        model: 'gpt-4o-mini',
        usage: { total_tokens: 42 },
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
    });

  it('returns the corrected text and locates each edit in the input', async () => {
    const fetchImpl = reply({
      correctedText: 'I managed 5 engineers at Acme.',
      edits: [
        { original: 'manged', replacement: 'managed', message: 'Spelling' },
        { original: 'not in text', replacement: 'x', message: 'dropped' },
        { original: 42, replacement: 'x' },
      ],
    });
    const { result, model, tokensUsed } = await grammarCheckWithOpenAi(
      { text: 'I manged 5 engineers at Acme.' },
      'en',
      { env, fetchImpl }
    );
    expect(result).toMatchObject({ ok: true, correctedText: 'I managed 5 engineers at Acme.' });
    expect(result.edits).toEqual([
      { offset: 2, original: 'manged', replacement: 'managed', rule: 'llm', message: 'Spelling' },
    ]);
    expect({ model, tokensUsed }).toEqual({ model: 'gpt-4o-mini', tokensUsed: 42 });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ temperature: 0, response_format: { type: 'json_object' } });
    expect(body.messages[1].content).toContain('untrusted data');
  });

  it('rejects an answer that changes a number, an email or a URL', async () => {
    const fetchImpl = reply({ correctedText: 'I managed 6 engineers at Acme.', edits: [] });
    await expect(
      grammarCheckWithOpenAi({ text: 'I manged 5 engineers at Acme.' }, 'en', { env, fetchImpl })
    ).rejects.toThrow(/changed facts/);
  });

  it('rejects an answer that rewrites the text', async () => {
    const fetchImpl = reply({ correctedText: 'Led.', edits: [] });
    await expect(
      grammarCheckWithOpenAi({ text: 'I led a large team of engineers.' }, 'en', { env, fetchImpl })
    ).rejects.toThrow(/rewrote/);
  });

  it('rejects empty or malformed answers and HTTP errors', async () => {
    const text = { text: 'I led a team.' };
    await expect(
      grammarCheckWithOpenAi(text, 'en', { env, fetchImpl: reply({ edits: [] }) })
    ).rejects.toThrow(/no text/);
    await expect(
      grammarCheckWithOpenAi(text, 'en', { env, fetchImpl: reply({}, false) })
    ).rejects.toThrow(/failed \(500\)/);
    const notJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    });
    await expect(grammarCheckWithOpenAi(text, 'en', { env, fetchImpl: notJson })).rejects.toThrow(
      /invalid JSON/
    );
    await expect(grammarCheckWithOpenAi(text, 'en', { env: {} })).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('gateway falls back to the rules when OpenAI fails', async () => {
    const previous = { ...process.env };
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9';
    try {
      const response = await runAiFeature({
        feature: 'grammar-check',
        userId: 'u1',
        payload: { text: 'i led the the team.' },
      });
      expect(response).toMatchObject({ ok: true, provider: 'heuristic' });
      const data = response.data as { correctedText: string; warnings: string[] };
      expect(data.correctedText).toBe('I led the team.');
      expect(data.warnings.some((w) => w.startsWith('openai_fallback:'))).toBe(true);
    } finally {
      process.env = previous;
    }
  });

  it('gateway uses the rules without an API key and refuses empty text', async () => {
    process.env.AI_PROVIDER = 'heuristic';
    const ok = await runAiFeature({
      feature: 'grammar-check',
      userId: 'u1',
      payload: { text: 'hi' },
    });
    expect(ok).toMatchObject({ ok: true, provider: 'heuristic', model: 'heuristic-v1' });
    const empty = await runAiFeature({ feature: 'grammar-check', userId: 'u1', payload: {} });
    expect(empty).toMatchObject({ ok: false, error: 'text is required' });
  });
});

describe('@cvstudio/ai-service optimize with OpenAI (shared request helper)', () => {
  it('posts a JSON-mode request and parses the variants', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        usage: { total_tokens: 7 },
        choices: [
          { message: { content: '```json\n{"variants":[{"text":"Led X","rationale":"r"}]}\n```' } },
        ],
      }),
    });
    const out = await optimizeResumeWithOpenAi(
      { bulletText: 'Did X', jobDescription: 'JD' },
      { env: { OPENAI_API_KEY: 'k', OPENAI_BASE_URL: 'https://gw.example/v1/' }, fetchImpl }
    );
    expect(fetchImpl.mock.calls[0][0]).toBe('https://gw.example/v1/chat/completions');
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'gpt-4o', temperature: 0.35, max_tokens: 800 });
    expect(out).toMatchObject({ model: 'gpt-4o', tokensUsed: 7 });
    expect(out.result.variants[0]).toMatchObject({ text: 'Led X', rationale: 'r' });
  });

  it('rejects an answer without variants', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ choices: [{ message: { content: '{"variants":[]}' } }] }),
    });
    await expect(
      optimizeResumeWithOpenAi({ bulletText: 'Did X' }, { env: { AI_API_KEY: 'k' }, fetchImpl })
    ).rejects.toThrow(/invalid JSON schema/);
  });
});
