import { renderLifecycleEmail, LIFECYCLE_EMAIL_TYPES } from './lifecycle-email.templates';
import { signUnsubscribe, verifyUnsubscribe } from './unsubscribe-token';
import { isCvStarted } from './lifecycle-emails.service';

const env = { ENCRYPTION_KEY: 'unit-test-encryption-key-min-32-characters' } as NodeJS.ProcessEnv;
const ctx = {
  firstName: 'Awa',
  appUrl: 'https://cvstudio.ai',
  unsubscribeUrl: 'https://cvstudio.ai/desinscription?u=1&t=x',
};

describe('lifecycle e-mail templates', () => {
  it('renders every type with a subject, the greeting and a tracked call to action', () => {
    for (const type of LIFECYCLE_EMAIL_TYPES) {
      const email = renderLifecycleEmail(type, ctx);
      expect(email.subject.length).toBeGreaterThan(10);
      expect(email.html).toContain('Bonjour Awa,');
      expect(email.text).toContain('Bonjour Awa,');
      expect(email.html).toContain(`utm_campaign=${type}`);
      expect(email.html).toContain('utm_source=email');
    }
  });

  it('offers unsubscribe on reminders, not on the billing notice', () => {
    expect(renderLifecycleEmail('ats_tip', ctx).html).toContain('Se désinscrire');
    expect(renderLifecycleEmail('ats_tip', ctx).text).toContain(ctx.unsubscribeUrl);
    const billing = renderLifecycleEmail('trial_ending', ctx);
    expect(billing.html).not.toContain('Se désinscrire');
    expect(billing.text).toContain('concerne votre abonnement');
  });

  it('states the trial end date and the plan, and how to cancel', () => {
    const email = renderLifecycleEmail('trial_ending', {
      ...ctx,
      planName: 'Pro',
      trialEnd: new Date('2026-10-12T10:00:00Z'),
    });
    expect(email.subject).toBe('Votre essai Pro se termine le 12 octobre');
    // No price: the plan table cannot know the billed interval or currency.
    expect(email.text).not.toMatch(/€|FCFA|XOF/);
    expect(email.text).toContain('espace facturation');
    expect(email.text).toContain('annuler en un clic');
    expect(email.html).toContain('/account/billing?');
  });

  it('adapts the unfinished-CV reminder to users with and without a CV', () => {
    const none = renderLifecycleEmail('cv_unfinished', { ...ctx, hasCv: false });
    const started = renderLifecycleEmail('cv_unfinished', { ...ctx, hasCv: true });
    expect(none.subject).toBe('Créez votre CV en 2 minutes');
    expect(none.html).toContain('/bienvenue?');
    expect(started.subject).toContain('presque prêt');
    expect(started.html).toContain('/dashboard?');
  });

  it('escapes user-controlled text', () => {
    const email = renderLifecycleEmail('ats_tip', { ...ctx, firstName: '<script>x</script>' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('unsubscribe token', () => {
  it('verifies its own signature only', () => {
    const token = signUnsubscribe('user-1', env);
    expect(verifyUnsubscribe('user-1', token, env)).toBe(true);
    expect(verifyUnsubscribe('user-2', token, env)).toBe(false);
    expect(verifyUnsubscribe('user-1', `${token}x`, env)).toBe(false);
    expect(verifyUnsubscribe('user-1', undefined, env)).toBe(false);
    expect(verifyUnsubscribe(undefined, token, env)).toBe(false);
  });

  it('changes with the key', () => {
    const other = {
      ENCRYPTION_KEY: 'another-encryption-key-min-32-characters!',
    } as NodeJS.ProcessEnv;
    expect(signUnsubscribe('user-1', env)).not.toBe(signUnsubscribe('user-1', other));
  });
});

describe('isCvStarted', () => {
  it('needs a summary and at least one experience', () => {
    expect(isCvStarted(null)).toBe(false);
    expect(isCvStarted({ summary: { text: '' }, experiences: [{}] })).toBe(false);
    expect(isCvStarted({ summary: { text: 'Comptable' }, experiences: [] })).toBe(false);
    expect(isCvStarted({ summary: { text: 'Comptable' }, experiences: [{}] })).toBe(true);
    expect(isCvStarted({ summary: 'Comptable', experiences: [{}] })).toBe(true);
  });
});
