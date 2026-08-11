'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserProfile } from '@/lib/api';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';

type EditProfileFormProps = {
  user: UserProfile;
  onSave: (data: UpdateProfileInput) => Promise<unknown>;
  onCancel: () => void;
};

export function EditProfileForm({ user, onSave, onCancel }: EditProfileFormProps) {
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      location: user.location ?? '',
      bio: user.bio ?? '',
      avatarUrl: user.avatarUrl ?? '',
    },
  });

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-surface-card p-6"
      data-testid="edit-profile-form"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await onSave({
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone || undefined,
            location: values.location || undefined,
            bio: values.bio || undefined,
            avatarUrl: values.avatarUrl ? values.avatarUrl : null,
          });
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : 'Impossible de sauvegarder le profil';
          form.setError('root', { message });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" {...form.register('firstName')} />
          {form.formState.errors.firstName && (
            <p className="mt-1 text-xs text-error">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" {...form.register('lastName')} />
          {form.formState.errors.lastName && (
            <p className="mt-1 text-xs text-error">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled readOnly />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" {...form.register('phone')} />
        </div>
        <div>
          <Label htmlFor="location">Localisation</Label>
          <Input id="location" {...form.register('location')} />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          className="min-h-28 w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
          placeholder="Parlez de vous…"
          {...form.register('bio')}
        />
      </div>

      <div>
        <Label htmlFor="avatarUrl">Avatar (URL)</Label>
        <Input
          id="avatarUrl"
          type="url"
          placeholder="https://…"
          {...form.register('avatarUrl')}
        />
        {form.formState.errors.avatarUrl && (
          <p className="mt-1 text-xs text-error">{form.formState.errors.avatarUrl.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="text-sm text-error">{form.formState.errors.root.message}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
