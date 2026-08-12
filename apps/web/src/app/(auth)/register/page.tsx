'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { useRegister } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { LinkedInSignInButton } from '@/components/auth/linkedin-sign-in-button';

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <p className="mt-1 text-sm text-content-secondary">
        Déjà inscrit ?{' '}
        <Link href="/login" className="text-primary">
          Se connecter
        </Link>
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await registerMutation.mutateAsync(values);
          router.push('/dashboard');
        })}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" {...form.register('firstName')} />
          </div>
          <div>
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" {...form.register('lastName')} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
        </div>
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" {...form.register('password')} />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={registerMutation.isPending}
          data-testid="register-submit"
        >
          Créer mon compte
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-content-secondary">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-3">
        <GoogleSignInButton nextPath="/dashboard" />
        <LinkedInSignInButton nextPath="/dashboard" />
      </div>
    </div>
  );
}
