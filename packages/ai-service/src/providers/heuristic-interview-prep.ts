import { extractCvFacts, extractKeywords } from '../cv-facts';
import type {
  InterviewPrepInput,
  InterviewPrepResult,
  InterviewQuestion,
  InterviewType,
} from '../prompts/interview-prep';
import { INTERVIEW_PREP_PROMPT_ID, INTERVIEW_PREP_PROMPT_VERSION } from '../prompts/interview-prep';
import { findEvidence } from './heuristic-job-match';
import { skillsIn } from '../skills-lexicon';

const DISCLAIMER = 'Practice aid only — not a guarantee of hiring outcomes.';

const STAR_TIPS = [
  'Situation and task in one or two sentences',
  'Spend most of the time on what you did',
  'End with a result you can verify',
];

function normalizeType(value?: string): InterviewType {
  return value === 'technical' || value === 'hiring_manager' ? value : 'hr';
}

/**
 * Deterministic interview preparation: questions built from the JD keywords and the CV's own
 * roles. When the CV has no evidence for a JD requirement, the question is flagged
 * needsUserInput so the candidate prepares an honest answer instead of an invented one.
 */
export function interviewPrepHeuristic(input: InterviewPrepInput): InterviewPrepResult {
  const interviewType = normalizeType(input.interviewType);
  const base = {
    promptId: INTERVIEW_PREP_PROMPT_ID,
    promptVersion: INTERVIEW_PREP_PROMPT_VERSION,
    interviewType,
    disclaimer: DISCLAIMER,
  };
  const jobDescription = input.jobDescription ?? '';
  // Ask about named skills when the JD has any; fall back to its plain keywords otherwise.
  const skills = skillsIn(jobDescription);
  const keywords = skills.length ? skills : extractKeywords(jobDescription, 20);
  if (!keywords.length) {
    return {
      ...base,
      ok: false,
      questions: [],
      warnings: [],
      refusals: ['jobDescription has no usable keywords'],
    };
  }

  const facts = extractCvFacts(input.cvFacts);
  const covered = keywords
    .map((keyword) => ({ keyword, evidence: findEvidence(facts, keyword) }))
    .filter((k): k is { keyword: string; evidence: string } => Boolean(k.evidence));
  const gaps = keywords.filter((k) => !covered.some((c) => c.keyword === k));
  const roles = facts.experiences.filter((e) => e.title || e.company);
  const questions: InterviewQuestion[] = [];

  if (interviewType === 'hr') {
    questions.push({
      question: 'Tell me about yourself.',
      framework: 'open',
      tips: [
        facts.headline || facts.summary
          ? 'Start from your headline and summary, then link them to this role'
          : 'Prepare a two-minute path: current role, key achievement, why this job',
        'Keep it under two minutes',
      ],
      needsUserInput: !facts.headline && !facts.summary,
      basedOn: facts.headline || undefined,
    });
    questions.push({
      question: 'Why do you want this role, and why now?',
      framework: 'open',
      tips: ['Name two points of the job description that match your experience'],
      needsUserInput: true,
    });
    for (const role of roles.slice(0, 2)) {
      questions.push({
        question: `What did you learn in your role as ${describe(role)}?`,
        framework: 'STAR',
        tips: STAR_TIPS,
        needsUserInput: false,
        basedOn: describe(role),
      });
    }
    questions.push({
      question: 'Tell me about a time you delivered under pressure.',
      framework: 'STAR',
      tips: STAR_TIPS,
      needsUserInput: roles.length === 0,
    });
  }

  if (interviewType === 'hiring_manager') {
    for (const role of roles.slice(0, 3)) {
      questions.push({
        question: `Walk me through your work as ${describe(role)}. What was the outcome?`,
        framework: 'STAR',
        tips: STAR_TIPS,
        needsUserInput: false,
        basedOn: describe(role),
      });
    }
    for (const { keyword, evidence } of covered.slice(0, 3)) {
      questions.push({
        question: `Give an example of how you used ${keyword} to get a result.`,
        framework: 'STAR',
        tips: STAR_TIPS,
        needsUserInput: false,
        basedOn: evidence,
      });
    }
  }

  if (interviewType === 'technical') {
    for (const { keyword, evidence } of covered.slice(0, 5)) {
      questions.push({
        question: `How have you used ${keyword} in a real project? What trade-offs did you make?`,
        framework: 'technical',
        tips: ['Describe the context, your choice, and one alternative you rejected'],
        needsUserInput: false,
        basedOn: evidence,
      });
    }
    questions.push({
      question: 'Describe a hard problem you debugged. How did you find the root cause?',
      framework: 'STAR',
      tips: STAR_TIPS,
      needsUserInput: roles.length === 0,
    });
  }

  for (const keyword of gaps.slice(0, interviewType === 'hr' ? 1 : 3)) {
    questions.push({
      question: `The role mentions ${keyword}. What is your experience with it?`,
      framework: 'open',
      tips: [
        'Your CV does not mention it: be honest about your level',
        'Explain how you would ramp up, with a concrete example of learning fast',
      ],
      needsUserInput: true,
      basedOn: keyword,
    });
  }

  const warnings: string[] = [];
  if (!roles.length) {
    warnings.push('Your CV has no experience yet: most answers need your own examples.');
  }

  return { ...base, ok: true, questions, warnings, refusals: [] };
}

function describe(role: { title: string; company: string }): string {
  return [role.title, role.company].filter(Boolean).join(' at ');
}
