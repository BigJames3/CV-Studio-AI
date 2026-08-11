'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
        Entrez votre email — si un compte existe, vous recevrez un lien de réinitialisation.
      </p>
      {sent ? (
        <p className="mt-6 text-sm text-primary">
          Si un compte existe pour cet email, un message a été envoyé.
        </p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await authApi.forgotPassword(values.email);
              setSent(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
            }
          })}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Envoyer le lien
          </Button>
          {error && <p className="text-sm text-error">{error}</p>}
        </form>
      )}
      <Link href="/login" className="mt-6 text-sm text-primary">
        Retour connexion
      </Link>
    </div>
  );
}
