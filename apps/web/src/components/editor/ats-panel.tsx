'use client';

import { useCallback, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type AtsReportResult = Awaited<ReturnType<typeof aiApi.checkAts>>;

type Props = {
  cvId: string;
  onClose: () => void;
};

function scoreTone(score: number): string {
  if (score >= 80) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

export function AtsPanel({ cvId, onClose }: Props) {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AtsReportResult | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.checkAts({
        cvId,
        jobDescription: jobDescription.trim() || undefined,
      });
      setReport(data);
      track('ats_score_viewed', {
        cv_id: cvId,
        ats_score: data.atsScore,
        has_jd: Boolean(jobDescription.trim()),
        missing_count: data.missingKeywords?.length ?? 0,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Analyse ATS impossible';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cvId, jobDescription]);

  return (
    <div className="flex h-full flex-col" data-testid="ats-panel">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
          Score ATS
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-surface-app"
          aria-label="Fermer le panneau ATS"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-sm text-[color:var(--cv-text-secondary)]">
        Vérifiez la lisibilité machine et l’alignement mots-clés avec une offre (optionnel).
      </p>

      <label className="mb-3 block text-sm">
        Offre d’emploi (optionnel)
        <textarea
          className="mt-1 min-h-[120px] w-full resize-y rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
          placeholder="Collez la description du poste pour un score ciblé…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={loading}
        />
      </label>

      <Button
        size="sm"
        className="mb-4 w-full"
        onClick={runCheck}
        disabled={loading || !cvId}
        data-testid="ats-analyze"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse…
          </>
        ) : (
          'Analyser'
        )}
      </Button>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {report && (
        <div className="space-y-4" data-testid="ats-results">
          <div className="rounded-md border border-border bg-surface-card p-3 text-center">
            <p className={cn('text-3xl font-semibold tabular-nums', scoreTone(report.atsScore))}>
              {Math.round(report.atsScore)}
            </p>
            <p className="text-xs text-[color:var(--cv-text-secondary)]">/ 100</p>
            {report.explanation ? (
              <p className="mt-2 text-sm" data-testid="ats-explanation">
                {report.explanation}
              </p>
            ) : null}
            {!jobDescription.trim() && (
              <p className="mt-2 text-xs text-[color:var(--cv-text-secondary)]">
                Score structure (sans offre). Ajoutez une JD pour le matching mots-clés.
              </p>
            )}
          </div>

          {report.improvements && report.improvements.length > 0 ? (
            <div data-testid="ats-improvements">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
                Quick wins
              </p>
              <ul className="list-disc space-y-1.5 pl-4 text-sm">
                {report.improvements.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.missingKeywords && report.missingKeywords.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
                Mots-clés manquants
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {report.missingKeywords.map((kw) => (
                  <li
                    key={kw}
                    className="rounded border border-border bg-surface-app px-2 py-0.5 text-xs"
                  >
                    {kw}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.matchedKeywords && report.matchedKeywords.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
                Mots-clés couverts
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {report.matchedKeywords.map((kw) => (
                  <li
                    key={kw}
                    className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    {kw}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(report.recommendations?.format?.length || report.recommendations?.content?.length) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
                Recommandations
              </p>
              <ul className="list-disc space-y-1.5 pl-4 text-sm">
                {[...(report.recommendations?.format ?? []), ...(report.recommendations?.content ?? [])].map(
                  (tip) => (
                    <li key={tip}>{tip}</li>
                  )
                )}
              </ul>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-[color:var(--cv-text-secondary)]">
            Indication heuristique — ne garantit pas le passage de tous les ATS.
          </p>
        </div>
      )}
    </div>
  );
}
