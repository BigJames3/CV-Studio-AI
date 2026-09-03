'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useLogin } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { LinkedInSignInButton } from '@/components/auth/linkedin-sign-in-button';
import { sanitizeNextPath } from '@/lib/safe-next';
import { authApi } from '@/lib/api';

const totpSchema = z.object({
  totp: z.string().min(6, 'Code requis').max(16),
});

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const login = useLogin();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const totpForm = useForm<z.infer<typeof totpSchema>>({
    resolver: zodResolver(totpSchema),
  });
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [oauthTempToken, setOauthTempToken] = useState<string | null>(null);

  const nextPath = sanitizeNextPath(search.get('next'));

  useEffect(() => {
    const pending = sessionStorage.getItem('oauth_temp_token');
    if (pending) {
      sessionStorage.removeItem('oauth_temp_token');
      setOauthTempToken(pending);
    }
  }, []);

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12"
      data-testid="login-page"
    >
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <p className="mt-1 text-sm text-content-secondary">
        Pas de compte ?{' '}
        <Link href="/register" className="text-primary">
          Créer un compte
        </Link>
      </p>

      {pendingCredentials || oauthTempToken ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={totpForm.handleSubmit(async (values) => {
            if (oauthTempToken) {
              await authApi.complete2fa(oauthTempToken, values.totp);
              router.push(nextPath);
              return;
            }
            if (!pendingCredentials) return;
            const result = await login.mutateAsync({
              ...pendingCredentials,
              totp: values.totp,
            });
            if (!('requires2fa' in result)) {
              router.push(nextPath);
            }
          })}
        >
          <p className="text-sm text-content-secondary">
            Entrez le code de votre application d’authentification.
          </p>
          <div>
            <Label htmlFor="totp">Code 2FA</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              {...totpForm.register('totp')}
            />
            {totpForm.formState.errors.totp && (
              <p className="mt-1 text-xs text-error">{totpForm.formState.errors.totp.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Vérification…' : 'Valider'}
          </Button>
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => {
              setPendingCredentials(null);
              setOauthTempToken(null);
            }}
          >
            Retour
          </button>
          {login.isError && <p className="text-sm text-error">Code invalide ou session expirée.</p>}
        </form>
      ) : (
        <>
          <form
            className="mt-8 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              const result = await login.mutateAsync(values);
              if ('requires2fa' in result) {
                setPendingCredentials(values);
                return;
              }
              router.push(nextPath);
            })}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                data-testid="login-email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-error">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                data-testid="login-password"
                {...form.register('password')}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
              data-testid="login-submit"
            >
              {login.isPending ? 'Connexion…' : 'Se connecter'}
            </Button>
            {login.isError && (
              <p className="text-sm text-error" data-testid="login-error" role="alert">
                Identifiants invalides ou API indisponible.
              </p>
            )}
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-content-secondary">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <GoogleSignInButton
              nextPath={nextPath}
              onRequires2fa={(tempToken) => setOauthTempToken(tempToken)}
            />
            <LinkedInSignInButton nextPath={nextPath} />
          </div>
          <Link href="/forgot-password" className="mt-4 text-sm text-primary">
            Mot de passe oublié
          </Link>
        </>
      )}
    </div>
  );
}
