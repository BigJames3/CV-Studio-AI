import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Lettre et chiffre requis'),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(120),
  lastName: z.string().min(1, 'Nom requis').max(120),
  phone: z.string().max(64).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  avatarUrl: z.union([z.string().url('URL invalide'), z.literal(''), z.null()]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(8, '8 caractères minimum')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Lettre et chiffre requis'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const identitySchema = z.object({
  fullName: z.string().min(1).max(200),
  headline: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(64).optional(),
  city: z.string().max(120).optional(),
});

export const experienceItemSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().nullable().optional(),
  current: z.boolean().optional(),
  bullets: z.array(z.string()).default([]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
