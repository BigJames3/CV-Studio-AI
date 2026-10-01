import type { TemplateCustomization, TemplateKey } from './types';

/**
 * How each template behaves on paper (browser print and PDF export).
 *
 * The page box itself never has a margin (`@page { margin: 0 }`): page margins stay white
 * whatever the template paints, which would cut colored columns and custom backgrounds.
 * Each template keeps its own safe area instead:
 *
 * - The elements marked `data-cv-flow` in a template carry the text flow. In print they use
 *   `box-decoration-break: clone`, so their own top/bottom padding (the template's margins) is
 *   repeated on every page. Page 1 is unchanged.
 * - `continuationTop` adds space at the top of pages 2+ only, for templates whose first page
 *   starts with a full-bleed band and whose body has little top padding of its own.
 * - `pageBackground` repeats on every page behind the CV, so colored columns and backgrounds
 *   reach the bottom edge of the last page too.
 */
/** A full-height colored band of the page background, e.g. a sidebar column. */
export type PageBand = { left: string; width: string; color: string };

export type TemplatePageLayout = {
  /**
   * `document`: classic CV, its padding acts as the page margins.
   * `full-bleed`: columns, bands or backgrounds run to the paper edges.
   */
  kind: 'document' | 'full-bleed';
  /** Extra top space on continuation pages (CSS length), on top of the flow's own padding. */
  continuationTop: string;
  /**
   * Painted on every page behind the CV: the template background, plus the full-height bands
   * of its columns. Solid rectangles, not gradients: PDF viewers do not all place gradient
   * stops at the same spot, while solid fills match the template columns everywhere.
   */
  pageBackground: (c: TemplateCustomization) => { color: string; bands: PageBand[] };
};

const plain = (c: TemplateCustomization) => ({ color: c.backgroundColor, bands: [] });

/** A colored column on the left, optionally closed by a vertical rule on its right edge. */
function leftColumn(width: string, color: string, rule?: { width: string; color: string }) {
  const bands: PageBand[] = [{ left: '0', width, color }];
  if (rule)
    bands.push({ left: `calc(${width} - ${rule.width})`, width: rule.width, color: rule.color });
  return bands;
}

export const TEMPLATE_PAGE_LAYOUT: Record<TemplateKey, TemplatePageLayout> = {
  // Classic documents: the template padding is the margin, repeated on every page.
  classic: { kind: 'document', continuationTop: '0', pageBackground: plain },
  ats: {
    kind: 'document',
    continuationTop: '0',
    pageBackground: () => ({ color: '#ffffff', bands: [] }),
  },
  executive: { kind: 'document', continuationTop: '0', pageBackground: plain },
  minimal: { kind: 'document', continuationTop: '0', pageBackground: plain },
  compact: { kind: 'document', continuationTop: '0', pageBackground: plain },
  developer: { kind: 'document', continuationTop: '0', pageBackground: plain },
  timeline: { kind: 'document', continuationTop: '0', pageBackground: plain },
  // Two-column grid: the main column restarts each page with the template's own 1.5rem padding.
  startup: { kind: 'document', continuationTop: '1.5rem', pageBackground: plain },

  // Full-height columns or stripes: they must touch the top and bottom edge of every page.
  modern: {
    kind: 'full-bleed',
    continuationTop: '0',
    pageBackground: (c) => ({
      color: c.backgroundColor,
      bands: leftColumn('32%', '#f8fafc', { width: '3px', color: c.primaryColor }),
    }),
  },
  sidebar: {
    kind: 'full-bleed',
    continuationTop: '0',
    pageBackground: (c) => ({ color: c.backgroundColor, bands: leftColumn('35%', c.primaryColor) }),
  },
  elegant: {
    kind: 'full-bleed',
    continuationTop: '0',
    pageBackground: (c) => ({
      color: c.backgroundColor,
      bands: leftColumn('34%', '#faf7f2', { width: '1px', color: c.accentColor }),
    }),
  },
  health: {
    kind: 'full-bleed',
    continuationTop: '0',
    pageBackground: (c) => ({ color: c.backgroundColor, bands: leftColumn('10px', c.accentColor) }),
  },

  // Full-bleed band at the top of page 1; the body below it has almost no top padding.
  banner: { kind: 'full-bleed', continuationTop: '10mm', pageBackground: plain },
  creative: { kind: 'full-bleed', continuationTop: '6mm', pageBackground: plain },
  infographic: { kind: 'full-bleed', continuationTop: '10mm', pageBackground: plain },
};

export function pageLayoutOf(templateKey: TemplateKey): TemplatePageLayout {
  return TEMPLATE_PAGE_LAYOUT[templateKey] ?? TEMPLATE_PAGE_LAYOUT.modern;
}

export const PAPER_SIZES = {
  A4: { width: '210mm', height: '297mm', css: 'A4' },
  Letter: { width: '8.5in', height: '11in', css: 'letter' },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

/**
 * Paged-media rules shared by browser print and the PDF export. TemplateWrapper renders them
 * inside the CV, so the serialized HTML sent to the PDF service carries the same rules.
 */
export const PAGED_MEDIA_CSS = `
@media print {
  [data-cv-page-bg] { display: block !important; }
  [data-cv-flow] {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  /* Body under a page-1 band: a transparent border, repeated on every page, gives pages 2+
     their top space; the negative margin cancels it on page 1. */
  [data-cv-flow='body'] {
    border-top: var(--cv-continuation-top, 0px) solid transparent !important;
    margin-top: calc(-1 * var(--cv-continuation-top, 0px)) !important;
  }
  [data-cv-preview] h1,
  [data-cv-preview] h2,
  [data-cv-preview] h3 {
    break-after: avoid;
    page-break-after: avoid;
  }
  [data-cv-preview] li,
  [data-cv-preview] img,
  [data-cv-preview] svg {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;
