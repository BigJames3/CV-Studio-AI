'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Doit contenir une lettre et un chiffre'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <h1 className="text-2xl font-semibold">Lien invalide</h1>
        <Link href="/forgot-password" className="mt-4 text-sm text-primary">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await authApi.resetPassword(token, values.newPassword);
            router.push('/login');
          } catch (err) {
            form.setError('root', {
              message: err instanceof ApiError ? err.message : 'Échec de la réinitialisation',
            });
          }
        })}
      >
        <div>
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <Input id="newPassword" type="password" {...form.register('newPassword')} />
          {form.formState.errors.newPassword && (
            <p className="mt-1 text-xs text-error">{form.formState.errors.newPassword.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="confirm">Confirmer</Label>
          <Input id="confirm" type="password" {...form.register('confirm')} />
          {form.formState.errors.confirm && (
            <p className="mt-1 text-xs text-error">{form.formState.errors.confirm.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          Mettre à jour
        </Button>
        {form.formState.errors.root && (
          <p className="text-sm text-error">{form.formState.errors.root.message}</p>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-sm">
          Chargement…
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  );
}
