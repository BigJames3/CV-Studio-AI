'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { templateAccessType } from '@cvstudio/shared-utils';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { TemplateCard } from '@/app/(app)/dashboard/templates/components/TemplateCard';
import { useFeatureGate, useMe } from '@/hooks';
import { cvsApi, queryKeys, usersApi, type CareerLevel } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { track } from '@/lib/analytics';
import { CV_EXAMPLES, buildStarterContent, findExampleForRole } from '@/lib/cv-examples';
import { TEMPLATE_CATALOG, categoryToKey } from '@/lib/templates/catalog';
import { cn } from '@/lib/utils';

const LEVELS: Array<{ value: CareerLevel; label: string }> = [
  { value: 'student', label: 'Étudiant / premier emploi' },
  { value: 'junior', label: 'Junior (moins de 3 ans)' },
  { value: 'confirmed', label: 'Confirmé (3 à 8 ans)' },
  { value: 'senior', label: 'Senior (plus de 8 ans)' },
];

type Step = 1 | 2 | 3;

/** Selected choice card. --cv-color-primary is a raw CSS variable: no Tailwind opacity modifier. */
const SELECTED = 'border-primary bg-primary-subtle font-medium ring-1 ring-primary';

/**
 * Guided onboarding, shown once after sign-up: target job → starting point (job example or
 * blank page) → template, then the first CV opens in the editor. Every step can be skipped.
 */
export default function WelcomePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useMe();
  const { canUseTemplateType, canCreateMoreCVs, showUpgrade } = useFeatureGate();

  const [step, setStep] = useState<Step>(1);
  const [targetRole, setTargetRole] = useState('');
  const [careerLevel, setCareerLevel] = useState<CareerLevel | undefined>();
  const [start, setStart] = useState<'example' | 'blank'>('example');
  const [exampleSlug, setExampleSlug] = useState<string>(CV_EXAMPLES[0].slug);
  const freeTemplates = TEMPLATE_CATALOG.filter((t) => !t.isPremium);
  const [templateId, setTemplateId] = useState(freeTemplates[0]?.id ?? TEMPLATE_CATALOG[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('onboarding_viewed');
  }, []);

  useEffect(() => {
    if (user?.targetRole && !targetRole) setTargetRole(user.targetRole);
    // Only prefill once, from the saved profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.targetRole]);

  const suggested = useMemo(() => findExampleForRole(targetRole), [targetRole]);
  useEffect(() => {
    if (suggested) setExampleSlug(suggested.slug);
  }, [suggested]);

  const example = CV_EXAMPLES.find((e) => e.slug === exampleSlug);
  const template = TEMPLATE_CATALOG.find((t) => t.id === templateId) ?? TEMPLATE_CATALOG[0];

  const goTo = (next: Step) => {
    track('onboarding_step_completed', { step, next });
    setStep(next);
  };

  const skip = async () => {
    track('onboarding_skipped', { step });
    await usersApi.updateOnboarding({ completed: true }).catch(() => undefined);
    await qc.invalidateQueries({ queryKey: queryKeys.user.me() });
    router.push('/dashboard');
  };

  const createCv = async () => {
    const access = template.accessTier ?? templateAccessType(template.isPremium);
    if (!canUseTemplateType(access)) {
      showUpgrade('templates:pro');
      return;
    }
    if (!canCreateMoreCVs) {
      showUpgrade('cv:create');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const role = targetRole.trim();
      await usersApi.updateOnboarding({
        ...(role ? { targetRole: role } : {}),
        ...(careerLevel ? { careerLevel } : {}),
        completed: true,
      });
      const content = buildStarterContent({
        example: start === 'example' ? example : undefined,
        fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        email: user?.email,
        headline: role || undefined,
        templateKey: categoryToKey(String(template.category)),
        customization: template.designData?.defaults,
      });
      const cv = (await cvsApi.create({
        title: `CV — ${role || example?.label || 'Mon CV'}`,
        templateId: template.id,
        content,
      })) as { id: string };
      track('onboarding_completed', {
        start,
        example: start === 'example' ? exampleSlug : null,
        template: template.name,
        hasRole: Boolean(role),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.user.me() }),
        qc.invalidateQueries({ queryKey: ['cvs'] }),
      ]);
      router.push(`/editor/${cv.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ENTITLEMENT_REQUIRED') {
        showUpgrade('cv:create');
      } else {
        setError('Impossible de créer le CV pour le moment. Réessayez dans un instant.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="onboarding-page">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-content-secondary">Étape {step} sur 3</p>
          <h1 className="text-2xl font-semibold">
            {user?.firstName ? `Bienvenue, ${user.firstName} !` : 'Bienvenue !'}
          </h1>
        </div>
        <button
          type="button"
          onClick={skip}
          className="text-sm text-content-secondary underline-offset-2 hover:underline"
          data-testid="onboarding-skip"
        >
          Passer
        </button>
      </div>

      <div className="mb-8 flex gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn('h-1.5 flex-1 rounded-full', n <= step ? 'bg-primary' : 'bg-border')}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-6" data-testid="onboarding-step-1">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Quel poste visez-vous ?</h2>
            <Label htmlFor="targetRole">Poste recherché</Label>
            <Input
              id="targetRole"
              list="onboarding-roles"
              placeholder="Ex. Comptable, Développeur web, Infirmière…"
              value={targetRole}
              maxLength={120}
              onChange={(e) => setTargetRole(e.target.value)}
            />
            <datalist id="onboarding-roles">
              {CV_EXAMPLES.map((e) => (
                <option key={e.slug} value={e.label} />
              ))}
            </datalist>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Votre niveau</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={careerLevel === level.value}
                  onClick={() => setCareerLevel(level.value)}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left text-sm transition',
                    careerLevel === level.value ? SELECTED : 'border-border hover:border-primary/50'
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end">
            <Button onClick={() => goTo(2)} data-testid="onboarding-next">
              Continuer
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6" data-testid="onboarding-step-2">
          <h2 className="text-lg font-semibold">Par quoi voulez-vous commencer ?</h2>
          <div className="grid gap-3">
            <button
              type="button"
              aria-pressed={start === 'example'}
              onClick={() => setStart('example')}
              data-testid="onboarding-start-example"
              className={cn(
                'rounded-xl border p-4 text-left transition',
                start === 'example' ? SELECTED : 'border-border hover:border-primary/50'
              )}
            >
              <p className="font-semibold">💼 Partir d’un exemple pour mon métier</p>
              <p className="mt-1 text-sm text-content-secondary">
                Un CV déjà rédigé, avec des réalisations chiffrées à adapter à votre parcours.
              </p>
            </button>
            {start === 'example' && (
              <div className="space-y-1 pl-1">
                <Label htmlFor="example">Exemple</Label>
                <select
                  id="example"
                  data-testid="onboarding-example"
                  value={exampleSlug}
                  onChange={(e) => setExampleSlug(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
                >
                  {CV_EXAMPLES.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.label}
                    </option>
                  ))}
                </select>
                {suggested ? (
                  <p className="text-xs text-content-secondary">
                    Choisi d’après votre poste : {suggested.label}
                  </p>
                ) : null}
              </div>
            )}
            <button
              type="button"
              aria-pressed={start === 'blank'}
              onClick={() => setStart('blank')}
              data-testid="onboarding-start-blank"
              className={cn(
                'rounded-xl border p-4 text-left transition',
                start === 'blank' ? SELECTED : 'border-border hover:border-primary/50'
              )}
            >
              <p className="font-semibold">✏️ Page vierge</p>
              <p className="mt-1 text-sm text-content-secondary">
                Vous remplissez chaque section vous-même.
              </p>
            </button>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button onClick={() => goTo(3)} data-testid="onboarding-next">
              Continuer
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6" data-testid="onboarding-step-3">
          <h2 className="text-lg font-semibold">Choisissez un modèle</h2>
          <p className="text-sm text-content-secondary">Vous pourrez en changer à tout moment.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TEMPLATE_CATALOG.map((t) => {
              const locked = !canUseTemplateType(t.accessTier ?? templateAccessType(t.isPremium));
              return (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={t.id === templateId}
                  locked={locked}
                  lockLabel={t.accessTier === 'business' ? 'Business' : 'Pro'}
                  onSelect={() => (locked ? showUpgrade('templates:pro') : setTemplateId(t.id))}
                />
              );
            })}
          </div>
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button onClick={createCv} disabled={busy} data-testid="onboarding-create">
              {busy ? 'Création…' : 'Créer mon CV'}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
