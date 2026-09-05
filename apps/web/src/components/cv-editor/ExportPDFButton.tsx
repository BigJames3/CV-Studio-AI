'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, Eye, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { getAccessToken } from '@/lib/api/client';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { serializeCvPreviewHtml } from '@/lib/pdf/serialize-cv-preview';
import type { CvContent, TemplateKey } from '@/lib/templates/types';
import { cn } from '@/lib/utils';
import { useFeatureGate } from '@/hooks/useFeatureGate';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type ExportPdfOptions = {
  includeFooter?: boolean;
  includeHeader?: boolean;
  pageSize?: 'A4' | 'Letter';
  quality?: 'draft' | 'standard' | 'high';
  filename?: string;
};

type Props = {
  cvId: string;
  content: CvContent;
  templateKey: TemplateKey;
  cvName?: string;
  className?: string;
};

function defaultFilename(cvName?: string, fullName?: string): string {
  const base = (cvName || fullName || 'CV').trim().replace(/\.pdf$/i, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${base.replace(/\s+/g, '_')}_${date}`;
}

export function ExportPDFButton({ cvId, content, templateKey, cvName, className }: Props) {
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { canDownloadPDF, canPrint, showUpgrade } = useFeatureGate();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState(() =>
    defaultFilename(cvName, content.identity.fullName)
  );
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>('standard');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [showPreview, setShowPreview] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Close export panel on outside click / Escape
  useEffect(() => {
    if (!showPanel) return;
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPanel(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [showPanel]);

  const handleExportPDF = async () => {
    if (!canDownloadPDF) {
      showUpgrade('cv:export:pdf');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProgress('Preparing…');

    try {
      track('cv_exported', {
        cv_id: cvId,
        template: templateKey,
        format: 'pdf',
        status: 'started',
      });

      setProgress('Capturing preview…');
      // Wait a frame so preview paints at current template/customization
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const html = await serializeCvPreviewHtml({
        pageSize,
        title: filename,
      });

      if (!html?.trim()) {
        throw new Error('Could not capture preview');
      }

      setProgress('Generating PDF…');

      const token = getAccessToken();
      const headers: Record<string, string> = {
        Accept: 'application/pdf',
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/cvs/export/pdf`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          html,
          wysiwyg: true,
          content: { ...content, templateKey },
          includeFooter: false,
          includeHeader: false,
          pageSize,
          quality,
          filename,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const code = errJson?.error?.code as string | undefined;
        if (response.status === 403 || code === 'ENTITLEMENT_REQUIRED') {
          showUpgrade('cv:export:pdf');
          return;
        }
        const message =
          errJson?.error?.message ||
          errJson?.message ||
          errJson?.details?.errors?.join?.(', ') ||
          `Export failed (${response.status})`;
        throw new Error(message);
      }

      setProgress('Downloading…');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty PDF received');

      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const downloadName = match?.[1] || `${filename.replace(/\.pdf$/i, '')}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName.endsWith('.pdf') ? downloadName : `${downloadName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      track('cv_exported', {
        cv_id: cvId,
        template: templateKey,
        format: 'pdf',
        status: 'success',
        file_size: blob.size,
      });
      setShowPanel(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setShowPanel(true); // keep panel open so the error is visible
      track('cv_exported', {
        cv_id: cvId,
        template: templateKey,
        format: 'pdf',
        status: 'failed',
        error: message,
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleBrowserPrint = () => {
    if (!canPrint) {
      showUpgrade('cv:print');
      return;
    }
    // Inject @page size (Letter vs A4) then print. Print CSS hides all body
    // siblings of `.cv-print-dialog` so Save-as-PDF gets only the CV.
    const styleId = 'cv-print-page-size';
    document.getElementById(styleId)?.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@page { size: ${pageSize === 'Letter' ? 'letter' : 'A4'}; margin: 0; }`;
    document.head.appendChild(style);

    const cleanup = () => {
      style.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            if (!canDownloadPDF && !canPrint) {
              showUpgrade('cv:export:pdf');
              return;
            }
            setError(null);
            setShowPanel((v) => !v);
          }}
          className="gap-2"
          data-testid="export-pdf-open"
          aria-expanded={showPanel}
          aria-haspopup="dialog"
          title={canDownloadPDF ? undefined : 'Pro feature'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress ?? 'Generating PDF…'}
            </>
          ) : canDownloadPDF ? (
            <>
              <Download className="h-4 w-4" />
              Exporter PDF
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Upgrade to Pro
            </>
          )}
        </Button>
      </div>

      {showPanel && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-surface-card p-4 shadow-lg"
          role="dialog"
          aria-labelledby={dialogId}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 id={dialogId} className="text-sm font-semibold">
              Export PDF
            </h3>
            <button
              type="button"
              className="rounded p-1 hover:bg-surface-app"
              aria-label="Close"
              onClick={() => setShowPanel(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-3 block text-xs">
            Filename
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface-card px-2 py-1.5 text-sm"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Prenom_Nom_CV"
            />
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block text-xs">
              Page
              <select
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as 'A4' | 'Letter')}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </label>
            <label className="block text-xs">
              Quality
              <select
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                value={quality}
                onChange={(e) => setQuality(e.target.value as 'draft' | 'standard' | 'high')}
              >
                <option value="draft">Draft</option>
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => {
                if (!canPrint) {
                  showUpgrade('cv:print');
                  return;
                }
                setShowPanel(false);
                setShowPreview(true);
              }}
              data-testid="export-print-preview"
            >
              <Eye className="h-4 w-4" />
              Print preview
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isLoading || !canDownloadPDF}
              onClick={() => void handleExportPDF()}
              className="gap-2"
              data-testid="export-pdf-confirm"
              title={canDownloadPDF ? undefined : 'Pro feature'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progress ?? 'Generating…'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>

          {error && (
            <div
              className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      )}

      {showPreview &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="cv-print-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 print:static print:inset-auto print:block print:bg-transparent print:p-0"
            role="dialog"
            aria-modal="true"
            aria-label="Print preview"
          >
            {/* Backdrop — hidden when printing so it never covers the CV */}
            <button
              type="button"
              className="absolute inset-0 print:hidden"
              aria-label="Close print preview"
              onClick={() => setShowPreview(false)}
            />

            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-surface-card shadow-xl print:max-h-none print:w-auto print:max-w-none print:rounded-none print:bg-white print:shadow-none">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 print:hidden">
                <p className="text-sm font-semibold">Print preview ({pageSize})</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={handleBrowserPrint}
                    data-testid="export-browser-print"
                    title={canPrint ? undefined : 'Pro feature'}
                  >
                    <Printer className="h-4 w-4" />
                    Browser print
                  </Button>
                  <Button type="button" size="sm" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-[color:var(--cv-color-neutral-100)] p-6 dark:bg-[color:var(--cv-color-neutral-900)] print:overflow-visible print:bg-white print:p-0">
                <div className="cv-print-root mx-auto" data-paper={pageSize}>
                  <TemplateWrapper templateKey={templateKey} data={content} />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
