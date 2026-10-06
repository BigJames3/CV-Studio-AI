import { cvMentions, extractCvFacts, extractKeywords } from '../cv-facts';
import type {
  CareerAdviceCard,
  CareerAdviceInput,
  CareerAdviceResult,
} from '../prompts/career-advice';
import { CAREER_ADVICE_PROMPT_ID, CAREER_ADVICE_PROMPT_VERSION } from '../prompts/career-advice';

const HAS_NUMBER = /\d/;
const MIN_SUMMARY_CHARS = 120;
const MIN_SKILLS = 6;

/**
 * Deterministic career advice: each card comes from a check on the CV itself, so the advice
 * is about the document the user wrote, never about facts it does not contain.
 */
export function careerAdviceHeuristic(input: CareerAdviceInput): CareerAdviceResult {
  const facts = extractCvFacts(input.cvFacts);
  const targetRole = input.targetRole?.trim() ?? '';
  const cards: CareerAdviceCard[] = [];
  const bullets = facts.experiences.flatMap((e) => e.bullets);

  if (!facts.experiences.length) {
    cards.push({
      title: 'Show what you have done',
      type: 'experience',
      body: 'Your CV has no experience entries. Internships, freelance work, volunteering and projects all count.',
      priority: 'high',
      evidenceBased: true,
      actions: ['Add your most relevant role or project with two or three bullets'],
    });
  }

  if (facts.summary.length < MIN_SUMMARY_CHARS) {
    cards.push({
      title: facts.summary ? 'Expand your summary' : 'Add a summary',
      type: 'summary',
      body: 'Recruiters read the summary first. Three sentences: who you are, your strongest proof, what you are looking for.',
      priority: 'high',
      evidenceBased: true,
      actions: [
        targetRole ? `Mention “${targetRole}” as your target` : 'Name the role you are targeting',
      ],
    });
  }

  if (bullets.length) {
    const withNumbers = bullets.filter((b) => HAS_NUMBER.test(b)).length;
    if (withNumbers / bullets.length < 0.5) {
      cards.push({
        title: 'Quantify your impact',
        type: 'impact',
        body: `${bullets.length - withNumbers} of your ${bullets.length} bullets have no figure. A number you can verify (time saved, users, revenue, team size) makes a result concrete.`,
        priority: 'high',
        evidenceBased: true,
        actions: ['Add a verifiable figure to your two most important bullets'],
      });
    }
  }

  if (facts.skills.length < MIN_SKILLS) {
    cards.push({
      title: 'List more of your skills',
      type: 'skills',
      body: `Your Skills section has ${facts.skills.length} entries. ATS filters match on this list.`,
      priority: 'medium',
      evidenceBased: true,
      actions: ['Add skills your experience already shows (try Skills suggestions)'],
    });
  }

  if (targetRole) {
    const roleTerms = extractKeywords(targetRole, 5);
    const onTarget = roleTerms.some((t) => cvMentions(facts.text, t));
    if (!onTarget) {
      cards.push({
        title: `Position your CV for “${targetRole}”`,
        type: 'positioning',
        body: 'Nothing in your CV names this target yet. Align your headline and summary with it, using your real experience.',
        priority: 'high',
        evidenceBased: true,
        actions: ['Update your headline', 'Run the Job Matcher on two or three real job offers'],
      });
    }
  } else if (!facts.headline) {
    cards.push({
      title: 'Add a headline',
      type: 'positioning',
      body: 'A one-line headline under your name tells the reader which role you fit.',
      priority: 'medium',
      evidenceBased: true,
      actions: ['Write a headline that matches your current or target role'],
    });
  }

  if (!facts.certificates.length && !facts.projects.length) {
    cards.push({
      title: 'Add proof beyond your jobs',
      type: 'credibility',
      body: 'Projects and certificates give extra evidence, especially when changing roles.',
      priority: 'low',
      evidenceBased: true,
      actions: ['Add one project or certificate you can talk about'],
    });
  }

  cards.push({
    title: 'Test your CV against real offers',
    type: 'next-step',
    body: 'Run the Job Matcher on job descriptions you would apply to and close the gaps you truly can.',
    priority: 'low',
    evidenceBased: false,
    actions: ['Run the Job Matcher'],
  });

  return {
    ok: true,
    promptId: CAREER_ADVICE_PROMPT_ID,
    promptVersion: CAREER_ADVICE_PROMPT_VERSION,
    cards,
    disclaimer: 'General career information — not certified coaching or legal advice.',
    warnings: [],
  };
}
