'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/lib/validations/auth';
import { useChangePassword } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';

type ChangePasswordFormProps = {
  onSuccess?: () => void;
};

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-surface-card p-6"
      data-testid="change-password-form"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await changePassword.mutateAsync({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          });
          form.reset();
          onSuccess?.();
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Impossible de changer le mot de passe';
          form.setError('root', { message });
        }
      })}
    >
      <div>
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...form.register('currentPassword')}
        />
      </div>
      <div>
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...form.register('newPassword')}
        />
        {form.formState.errors.newPassword && (
          <p className="mt-1 text-xs text-error">{form.formState.errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirmer</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
        {form.formState.errors.confirmPassword && (
          <p className="mt-1 text-xs text-error">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-sm text-error">{form.formState.errors.root.message}</p>
      )}

      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? 'Modification…' : 'Changer le mot de passe'}
      </Button>
    </form>
  );
}
