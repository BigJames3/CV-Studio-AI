'use client';

import { useEffect, useState } from 'react';
import { useSetCvTeam, useTeams } from '@/hooks/useTeams';

/** Owner-side menu: share the CV with one of my active teams, or keep it private. */
export function TeamShareSelect({ cvId, teamId }: { cvId: string; teamId: string | null }) {
  const { data: teams } = useTeams();
  const setTeam = useSetCvTeam(cvId);
  const [value, setValue] = useState(teamId ?? '');

  useEffect(() => setValue(teamId ?? ''), [teamId]);

  // Viewers cannot share into a team; inactive teams hide shared CVs anyway.
  const options = (teams ?? []).filter((t) => t.myRole !== 'viewer' && t.active);
  if (options.length === 0 && !teamId) return null;

  return (
    <label className="hidden items-center gap-2 text-xs md:flex">
      Équipe
      <select
        data-testid="cv-team-select"
        className="rounded-md border border-border bg-surface-card px-2 py-1 text-sm"
        value={value}
        disabled={setTeam.isPending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          setTeam.mutate(next || null, { onError: () => setValue(previous) });
        }}
      >
        <option value="">Privé</option>
        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        {teamId && !options.some((t) => t.id === teamId) ? (
          <option value={teamId}>Équipe inactive</option>
        ) : null}
      </select>
    </label>
  );
}
