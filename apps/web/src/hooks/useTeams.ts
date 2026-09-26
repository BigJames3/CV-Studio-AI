'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { cvsApi, queryKeys, teamsApi, type TeamRole } from '@/lib/api';

const TEAM_ERRORS: Record<string, string> = {
  TEAM_ALREADY_OWNED: 'Vous possédez déjà une équipe.',
  USER_NOT_FOUND:
    'Aucun compte CV Studio n’utilise cet e-mail. Demandez-lui de s’inscrire d’abord.',
  ALREADY_MEMBER: 'Cette personne fait déjà partie de l’équipe.',
  TEAM_MEMBER_LIMIT: 'L’équipe a atteint sa limite de membres.',
  TEAM_INACTIVE: 'Le plan Business du propriétaire de l’équipe n’est plus actif.',
  TEAM_OWNER_REQUIRED: 'Seul le propriétaire peut faire cela.',
  TEAM_MANAGER_REQUIRED: 'Seuls le propriétaire et les admins gèrent les membres.',
  TEAM_OWNER_LOCKED: 'Le propriétaire ne peut pas être modifié ni retiré.',
  TEAM_EDITOR_REQUIRED: 'Les lecteurs ne peuvent pas partager de CV avec l’équipe.',
  ENTITLEMENT_REQUIRED: 'Les équipes sont réservées au plan Business.',
};

export function teamErrorMessage(err: unknown): string {
  if (err instanceof ApiError && TEAM_ERRORS[err.code]) return TEAM_ERRORS[err.code];
  return err instanceof Error ? err.message : 'Une erreur est survenue.';
}

const onError = (err: unknown) => toast.error(teamErrorMessage(err));

export function useTeams() {
  return useQuery({ queryKey: queryKeys.teams, queryFn: () => teamsApi.list() });
}

export function useTeam(id: string | null) {
  return useQuery({
    queryKey: queryKeys.team(id ?? ''),
    queryFn: () => teamsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useSharedCvs() {
  return useQuery({ queryKey: queryKeys.sharedCvs, queryFn: () => cvsApi.shared() });
}

export function useTeamMutations(teamId: string | null) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.teams });
    void qc.invalidateQueries({ queryKey: queryKeys.sharedCvs });
  };

  return {
    create: useMutation({
      mutationFn: (name: string) => teamsApi.create(name),
      onSuccess: refresh,
      onError,
    }),
    addMember: useMutation({
      mutationFn: (body: { email: string; role: Exclude<TeamRole, 'owner'> }) =>
        teamsApi.addMember(teamId as string, body),
      onSuccess: () => {
        toast.success('Membre ajouté');
        refresh();
      },
      onError,
    }),
    updateMember: useMutation({
      mutationFn: ({ memberId, role }: { memberId: string; role: Exclude<TeamRole, 'owner'> }) =>
        teamsApi.updateMember(teamId as string, memberId, role),
      onSuccess: refresh,
      onError,
    }),
    removeMember: useMutation({
      mutationFn: (memberId: string) => teamsApi.removeMember(teamId as string, memberId),
      onSuccess: refresh,
      onError,
    }),
    remove: useMutation({
      mutationFn: () => teamsApi.remove(teamId as string),
      onSuccess: refresh,
      onError,
    }),
  };
}

export function useSetCvTeam(cvId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string | null) => cvsApi.setTeam(cvId, teamId),
    onSuccess: (_res, teamId) => {
      toast.success(teamId ? 'CV partagé avec l’équipe' : 'Partage avec l’équipe arrêté');
      void qc.invalidateQueries({ queryKey: queryKeys.cv(cvId) });
      void qc.invalidateQueries({ queryKey: ['cvs'] });
    },
    onError,
  });
}
