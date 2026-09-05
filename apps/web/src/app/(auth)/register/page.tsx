'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Eye, EyeOff, Shield } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { useRegister } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { LinkedInSignInButton } from '@/components/auth/linkedin-sign-in-button';
import { PasswordStrength } from '@/components/auth/password-strength';
import { ApiError } from '@/lib/api/client';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const BENEFITS = [
  '1 CV et export PDF sans filigrane',
  '5 templates ATS (Modern, Creative, Executive…)',
  'Aucune carte bancaire requise',
  'Essai Pro 14 jours au checkout',
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-error" role="alert">
      {message}
    </p>
  );
}

function registerErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_TAKEN' || error.status === 409) {
      return 'Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.';
    }
    if (error.status === 429) {
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    }
    if (error.message && !/already registered|must be/i.test(error.message)) {
      return error.message;
    }
  }
  return 'Impossible de créer le compte. Vérifiez les champs et réessayez.';
}

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  });
  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const hasGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const hasLinkedIn = Boolean(process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID);
  const hasSocial = hasGoogle || hasLinkedIn;

  useEffect(() => {
    track('signup_started');
  }, []);

  return (
    <div
      className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,22rem)_1fr]"
      data-testid="register-page"
    >
      <aside className="hidden bg-[#0B1F2A] px-8 py-12 text-[#F4F7F6] lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            CV Studio AI
          </Link>
          <h2 className="mt-10 text-2xl font-semibold leading-snug">
            Un CV qui passe les ATS, en quelques minutes.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-[#A8C5BE]">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4BF]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[#A8C5BE]">
          Plan Gratuit · Pro 9,99 €/mois ·{' '}
          <Link href="/pricing" className="underline hover:text-white">
            Voir les tarifs
          </Link>
        </p>
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12">
        <p className="mb-6 lg:hidden">
          <Link href="/" className="text-sm font-semibold text-content-primary">
            CV Studio AI
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Créer votre CV avec l’IA</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Gratuit, sans carte bancaire.{' '}
          <Link href="/login" className="text-primary underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </p>

        {hasSocial ? (
          <>
            <div className="mt-8 space-y-3">
              {hasGoogle ? <GoogleSignInButton nextPath="/dashboard" /> : null}
              {hasLinkedIn ? <LinkedInSignInButton nextPath="/dashboard" /> : null}
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-content-secondary">
              <div className="h-px flex-1 bg-border" />
              ou par email
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : (
          <div className="mt-8" />
        )}

        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await registerMutation.mutateAsync({
                email: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
              });
              router.push('/dashboard');
            } catch {
              /* surfaced via registerMutation.error */
            }
          })}
        >
          {registerMutation.isError ? (
            <div
              className="rounded-lg border border-error bg-[color:var(--cv-color-error-subtle)] p-3 text-sm text-error"
              data-testid="register-error"
              role="alert"
            >
              {registerErrorMessage(registerMutation.error)}{' '}
              {registerMutation.error instanceof ApiError &&
              (registerMutation.error.code === 'EMAIL_TAKEN' ||
                registerMutation.error.status === 409) ? (
                <Link href="/login" className="font-medium underline">
                  Se connecter
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                placeholder="Léa"
                aria-invalid={Boolean(form.formState.errors.firstName)}
                aria-describedby={form.formState.errors.firstName ? 'firstName-error' : undefined}
                className={form.formState.errors.firstName ? 'border-error' : undefined}
                {...form.register('firstName')}
              />
              <FieldError id="firstName-error" message={form.formState.errors.firstName?.message} />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                placeholder="Martin"
                aria-invalid={Boolean(form.formState.errors.lastName)}
                aria-describedby={form.formState.errors.lastName ? 'lastName-error' : undefined}
                className={form.formState.errors.lastName ? 'border-error' : undefined}
                {...form.register('lastName')}
              />
              <FieldError id="lastName-error" message={form.formState.errors.lastName?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@email.com"
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
              className={form.formState.errors.email ? 'border-error' : undefined}
              {...form.register('email')}
            />
            <FieldError id="email-error" message={form.formState.errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="12 caractères, majuscule, chiffre…"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby="password-rules"
                className={cn('pr-10', form.formState.errors.password ? 'border-error' : undefined)}
                {...form.register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-content-muted hover:text-content-primary"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div id="password-rules">
              <PasswordStrength password={password} />
            </div>
            <FieldError id="password-error" message={form.formState.errors.password?.message} />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                className={cn(
                  'pr-10',
                  form.formState.errors.confirmPassword ? 'border-error' : undefined
                )}
                {...form.register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-content-muted hover:text-content-primary"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError
              id="confirmPassword-error"
              message={form.formState.errors.confirmPassword?.message}
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              id="acceptedTerms"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              {...form.register('acceptedTerms')}
            />
            <label htmlFor="acceptedTerms" className="text-sm text-content-secondary">
              J’accepte les{' '}
              <Link href="/terms" className="text-primary underline">
                conditions d’utilisation
              </Link>{' '}
              et la{' '}
              <Link href="/privacy" className="text-primary underline">
                politique de confidentialité
              </Link>
              .
            </label>
          </div>
          <FieldError
            id="acceptedTerms-error"
            message={form.formState.errors.acceptedTerms?.message}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
            data-testid="register-submit"
          >
            {registerMutation.isPending ? 'Création du compte…' : 'Créer mon compte'}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-content-muted">
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Compte chiffré
          </span>
          <span>Sans carte bancaire</span>
          <Link href="/pricing" className="text-primary hover:underline">
            Tarifs
          </Link>
        </div>
      </div>
    </div>
  );
}
