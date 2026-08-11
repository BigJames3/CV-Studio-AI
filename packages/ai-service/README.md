# packages/ai-service — cible monorepo

Package TypeScript partagé (Nest workers + API) pour :

- Prompt Registry (load `docs/ai/prompts` + versions)
- Guardrail pipeline (pre/post JSON schema validate)
- Model router (S/M/L + embeddings)
- Cost tracker
- Provider adapters (OpenAI, Anthropic, …)

## API interne suggérée

```ts
export interface AiGateway {
  generateCv(input: GenerateCvInput): Promise<AiResult>;
  optimizeResume(input: OptimizeInput): Promise<AiResult>;
  coverLetter(input: CoverLetterInput): Promise<AiResult>;
  matchJob(input: MatchInput): Promise<AiResult>;
  interviewPrep(input: InterviewInput): Promise<AiResult>;
  explainAts(input: AtsExplainInput): Promise<AiResult>;
  careerAdvice(input: CareerInput): Promise<AiResult>;
  generatePortfolio(input: PortfolioInput): Promise<AiResult>;
  grammarCheck(input: GrammarInput): Promise<AiResult>;
  suggestSkills(input: SkillsInput): Promise<AiResult>;
  mapLinkedIn(input: LinkedInInput): Promise<AiResult>;
  parsePdfStructure(input: OcrInput): Promise<AiResult>;
}
```

## Env

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_DEFAULT_PROVIDER=openai
AI_EMBEDDING_MODEL=text-embedding-3-large
AI_MODEL_S=gpt-4.1-mini
AI_MODEL_M=gpt-4.1
AI_COST_ALERT_USD_PER_DAY=50
```

Implémentation : à créer au Sprint IA (Phase 3) ; prompts sources de vérité = `docs/ai/prompts`.
