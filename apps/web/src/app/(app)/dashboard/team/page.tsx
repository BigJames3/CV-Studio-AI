'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMe, useUserPlan } from '@/hooks';
import { useTeam, useTeamMutations, useTeams } from '@/hooks/useTeams';
import { SUPPORT_BUSINESS_MAILTO } from '@/lib/billing/plans-catalog';
import type { TeamRole } from '@/lib/api';

type AssignableRole = Exclude<TeamRole, 'owner'>;

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  editor: 'Éditeur',
  viewer: 'Lecteur',
};

const ROLE_HELP =
  'Admin : gère les membres · Éditeur : modifie les CV partagés · Lecteur : consulte';

function CreateTeamForm() {
  const [name, setName] = useState('');
  const { create } = useTeamMutations(null);
  return (
    <form
      className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
      data-testid="create-team-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length >= 2) create.mutate(name.trim());
      }}
    >
      <Input
        aria-label="Nom de l’équipe"
        placeholder="Nom de l’équipe"
        value={name}
        maxLength={200}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
        {create.isPending ? 'Création…' : 'Créer l’équipe'}
      </Button>
    </form>
  );
}

function TeamPanel({ teamId }: { teamId: string }) {
  const { data: me } = useMe();
  const { data: team, isLoading } = useTeam(teamId);
  const { addMember, updateMember, removeMember, remove } = useTeamMutations(teamId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('editor');

  if (isLoading || !team) {
    return <p className="mt-6 text-sm text-content-secondary">Chargement de l’équipe…</p>;
  }

  const isOwner = team.myRole === 'owner';
  const canManage = isOwner || team.myRole === 'admin';
  const full = team.members.length >= team.memberLimit;
  // Admins manage editors and viewers; admins themselves are the owner's call.
  const canEdit = (target: TeamRole) =>
    canManage && target !== 'owner' && (isOwner || target !== 'admin');
  const grantable: AssignableRole[] = isOwner
    ? ['admin', 'editor', 'viewer']
    : ['editor', 'viewer'];
  const myMembership = team.members.find((m) => m.userId === me?.id);

  return (
    <section
      className="mt-6 rounded-lg border border-border bg-surface-card p-6"
      data-testid="team-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{team.name}</h2>
          <p className="text-sm text-content-secondary">
            {team.members.length} / {team.memberLimit} membres · Votre rôle :{' '}
            {ROLE_LABELS[team.myRole]}
          </p>
        </div>
        {isOwner ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (
                confirm(
                  'Supprimer l’équipe ? Les CV partagés redeviennent privés, aucun CV n’est supprimé.'
                )
              ) {
                remove.mutate();
              }
            }}
          >
            Supprimer l’équipe
          </Button>
        ) : myMembership ? (
          <Button
            size="sm"
            variant="outline"
            disabled={removeMember.isPending}
            onClick={() => {
              if (confirm('Quitter l’équipe ? Vos CV partagés avec elle redeviennent privés.')) {
                removeMember.mutate(myMembership.id);
              }
            }}
          >
            Quitter l’équipe
          </Button>
        ) : null}
      </div>

      {!team.active ? (
        <p className="mt-4 rounded-md bg-warning/15 p-3 text-sm text-warning" role="status">
          Le plan Business du propriétaire n’est plus actif : les CV partagés sont masqués et
          l’ajout de membres est suspendu jusqu’à sa réactivation.
        </p>
      ) : null}

      <ul className="mt-6 divide-y divide-border" data-testid="team-members">
        {team.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {`${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email}
              </p>
              <p className="truncate text-xs text-content-muted">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit(m.role) ? (
                <>
                  <select
                    aria-label={`Rôle de ${m.user.email}`}
                    className="h-8 rounded-md border border-border bg-surface-card px-2 text-sm"
                    value={m.role}
                    disabled={updateMember.isPending}
                    onChange={(e) =>
                      updateMember.mutate({
                        memberId: m.id,
                        role: e.target.value as AssignableRole,
                      })
                    }
                  >
                    {grantable.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removeMember.isPending}
                    onClick={() => {
                      if (confirm(`Retirer ${m.user.email} de l’équipe ?`))
                        removeMember.mutate(m.id);
                    }}
                  >
                    Retirer
                  </Button>
                </>
              ) : (
                <span className="rounded-full bg-[color:var(--cv-color-neutral-100)] px-2.5 py-0.5 text-xs">
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage ? (
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          data-testid="add-member-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            addMember.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') });
          }}
        >
          <Input
            type="email"
            aria-label="E-mail du membre"
            placeholder="e-mail d’un compte CV Studio"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={full || !team.active}
          />
          <select
            aria-label="Rôle du nouveau membre"
            className="h-10 rounded-md border border-border bg-surface-card px-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
          >
            {grantable.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={addMember.isPending || full || !team.active}>
            {addMember.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>
      ) : null}
      <p className="mt-3 text-xs text-content-muted">
        {full ? 'Limite de membres atteinte. ' : ''}
        {ROLE_HELP}. Partagez un CV depuis l’éditeur avec le menu « Équipe ».
      </p>
    </section>
  );
}

export default function TeamPage() {
  const { isBusiness } = useUserPlan();
  const { data: teams, isLoading, isError } = useTeams();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!teams?.length) {
      setSelected(null);
    } else if (!selected || !teams.some((t) => t.id === selected)) {
      setSelected((teams.find((t) => t.myRole === 'owner') ?? teams[0]).id);
    }
  }, [teams, selected]);

  const ownsTeam = teams?.some((t) => t.myRole === 'owner') ?? false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8" data-testid="team-page">
      <h1 className="text-3xl font-semibold">Équipe</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Travaillez à plusieurs sur vos CV : chaque membre les consulte ou les modifie selon son
        rôle.
      </p>

      {isLoading ? <p className="mt-6 text-sm">Chargement…</p> : null}
      {isError ? (
        <p className="mt-6 text-sm text-error">Impossible de charger vos équipes.</p>
      ) : null}

      {teams && teams.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Mes équipes">
          {teams.map((t) => (
            <Button
              key={t.id}
              role="tab"
              aria-selected={t.id === selected}
              size="sm"
              variant={t.id === selected ? 'primary' : 'outline'}
              onClick={() => setSelected(t.id)}
            >
              {t.name}
            </Button>
          ))}
        </div>
      ) : null}

      {selected ? <TeamPanel teamId={selected} /> : null}

      {!isLoading && !ownsTeam ? (
        isBusiness ? (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Créer votre équipe</h2>
            <p className="text-sm text-content-secondary">
              Jusqu’à 10 membres, qui doivent déjà avoir un compte CV Studio.
            </p>
            <CreateTeamForm />
          </div>
        ) : teams?.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-surface-card p-6">
            <p className="font-medium">
              La collaboration d’équipe est incluse dans le plan Business.
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              Vous pouvez aussi rejoindre l’équipe d’un collègue : il vous ajoute avec votre e-mail.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/account/billing">
                <Button size="sm">Voir les plans</Button>
              </Link>
              <a href={SUPPORT_BUSINESS_MAILTO}>
                <Button size="sm" variant="outline">
                  Contacter le support
                </Button>
              </a>
            </div>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
