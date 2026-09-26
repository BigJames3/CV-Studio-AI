import { NotImplementedException } from '@nestjs/common';
import { AiController, UNAVAILABLE_AI_FEATURES } from './ai.controller';

describe('AiController', () => {
  const ai = {
    generateCv: jest.fn(),
    matchJob: jest.fn(),
    interviewPrep: jest.fn(),
    careerAdvice: jest.fn(),
    generatePortfolio: jest.fn(),
    grammarCheck: jest.fn(),
    skillsSuggest: jest.fn(),
    linkedInImport: jest.fn(),
    parsePdf: jest.fn(),
  };
  const controller = new AiController(ai as never);

  const handlers: Record<(typeof UNAVAILABLE_AI_FEATURES)[number], () => never> = {
    'generate-cv': () => controller.generateCv(),
    'match-job': () => controller.matchJob(),
    'interview-prep': () => controller.interviewPrep(),
    'career-advice': () => controller.careerAdvice(),
    'generate-portfolio': () => controller.generatePortfolio(),
    'grammar-check': () => controller.grammarCheck(),
    'skills-suggest': () => controller.skillsSuggest(),
    'linkedin-import': () => controller.linkedInImport(),
    'parse-pdf': () => controller.parsePdf(),
  };

  it.each(UNAVAILABLE_AI_FEATURES)('answers 501 for unfinished feature %s', (feature) => {
    let error: unknown;
    try {
      handlers[feature]();
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(NotImplementedException);
    expect((error as NotImplementedException).getResponse()).toMatchObject({
      code: 'AI_FEATURE_UNAVAILABLE',
    });
  });

  it('never returns scaffold payloads from the service', () => {
    for (const handler of Object.values(handlers)) {
      expect(handler).toThrow(NotImplementedException);
    }
    for (const fn of Object.values(ai)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
