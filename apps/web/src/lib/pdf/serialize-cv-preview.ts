/**
 * Serialize the live CV preview from the browser with computed styles.
 * Ensures the PDF matches what the user sees in the editor (WYSIWYG).
 */

const PAPER: Record<'A4' | 'Letter', { width: string; height: string }> = {
  A4: { width: '210mm', height: '297mm' },
  Letter: { width: '8.5in', height: '11in' },
};

const STYLE_PROPS = [
  'display',
  'position',
  'box-sizing',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin',
  'padding',
  'border',
  'border-radius',
  'background',
  'background-color',
  'background-image',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'white-space',
  'overflow',
  'overflow-wrap',
  'word-break',
  'flex',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'gap',
  'row-gap',
  'column-gap',
  'grid',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'object-fit',
  'object-position',
  'opacity',
  'list-style',
  'vertical-align',
  'box-shadow',
  'outline',
  'z-index',
  'top',
  'right',
  'bottom',
  'left',
  'transform',
] as const;

const NO_PRINT_SELECTORS = [
  '.editor-controls',
  '.sidebar',
  '[data-no-print]',
  'button',
  'input',
  'textarea',
  '[role="toolbar"]',
] as const;

function absoluteUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
    return url;
  }
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function inlineElementStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  const parts: string[] = [];
  for (const prop of STYLE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value || value === 'none' || value === 'normal' || value === 'auto') {
      if (prop === 'display' || prop === 'width' || prop === 'font-family' || prop === 'font-size') {
        parts.push(`${prop}:${value}`);
      }
      continue;
    }
    // Kill editor chrome artifacts (scale / drop shadow live outside print)
    if (prop === 'box-shadow') continue;
    if (prop === 'transform' && value !== 'none') continue;
    parts.push(`${prop}:${value}`);
  }
  parts.push('-webkit-print-color-adjust:exact', 'print-color-adjust:exact');
  target.setAttribute('style', parts.join(';'));

  if (target instanceof HTMLImageElement && source instanceof HTMLImageElement) {
    target.src = absoluteUrl(source.currentSrc || source.src);
    target.removeAttribute('srcset');
  }

  const srcChildren = Array.from(source.children) as HTMLElement[];
  const tgtChildren = Array.from(target.children) as HTMLElement[];
  for (let i = 0; i < srcChildren.length; i++) {
    if (srcChildren[i] && tgtChildren[i]) {
      inlineElementStyles(srcChildren[i], tgtChildren[i]);
    }
  }
}

function collectFontFaces(): string {
  const faces: string[] = [];
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule) {
          faces.push(rule.cssText);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return faces.join('\n');
}

function googleFontsLink(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />`;
}

function removeInteractiveElements(element: HTMLElement): void {
  for (const selector of NO_PRINT_SELECTORS) {
    element.querySelectorAll(selector).forEach((el) => el.remove());
  }
}

async function imageToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src) return;
      try {
        img.src = await imageToDataUrl(absoluteUrl(src));
        img.removeAttribute('srcset');
      } catch (error) {
        console.warn('Failed to inline image for PDF:', src, error);
      }
    })
  );

  // CSS background-image: url(...) → data URL where possible
  const withBg = Array.from(element.querySelectorAll('*')) as HTMLElement[];
  await Promise.all(
    withBg.map(async (el) => {
      const bg = el.style.backgroundImage;
      if (!bg || bg === 'none' || !bg.includes('url(')) return;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match?.[1] || match[1].startsWith('data:')) return;
      try {
        const dataUrl = await imageToDataUrl(absoluteUrl(match[1]));
        el.style.backgroundImage = `url("${dataUrl}")`;
      } catch {
        /* keep original */
      }
    })
  );
}

function findPreviewElement(selector: string): HTMLElement {
  const candidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  if (!candidates.length) {
    throw new Error(
      'Preview element not found. Ensure TemplateWrapper has data-cv-preview attribute'
    );
  }
  // Prefer live editor preview (not print-dialog clone). Accept hidden mobile
  // previews (display:none → height 0) so export still works from the tools tab.
  const editorCandidates = candidates.filter(
    (el) => !el.closest('[aria-label="Print preview"]') && !el.closest('.cv-print-dialog')
  );
  const visible = editorCandidates.find((el) => el.getBoundingClientRect().height > 0);
  return visible ?? editorCandidates[0] ?? candidates[candidates.length - 1]!;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SerializeCvOptions = {
  pageSize?: 'A4' | 'Letter';
  title?: string;
  selector?: string;
};

/**
 * Capture `[data-cv-preview]` (TemplateWrapper) as standalone HTML with inlined
 * computed styles, fonts, and images for Puppeteer WYSIWYG export.
 */
export async function serializeCvPreviewHtml(options: SerializeCvOptions = {}): Promise<string> {
  const pageSize = options.pageSize ?? 'A4';
  const paper = PAPER[pageSize];
  const selector = options.selector ?? '[data-cv-preview]';
  const source = findPreviewElement(selector);

  const clone = source.cloneNode(true) as HTMLElement;
  inlineElementStyles(source, clone);
  removeInteractiveElements(clone);
  await inlineImages(clone);

  // Exact paper frame for Puppeteer (no editor scale / shadow)
  clone.style.width = paper.width;
  clone.style.minHeight = paper.height;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.transform = 'none';
  clone.style.overflow = 'visible';
  clone.setAttribute('data-cv-export', '1');

  const fontFaces = collectFontFaces();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title || 'CV')}</title>
${googleFontsLink()}
<style>
  @page { size: ${pageSize}; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${paper.width};
    background: #ffffff;
  }
  body { overflow: hidden; }
  [data-cv-export] {
    width: ${paper.width} !important;
    min-height: ${paper.height} !important;
    box-shadow: none !important;
    transform: none !important;
  }
  img { max-width: 100%; height: auto; }
  ${fontFaces}
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`;
}

/** @deprecated Prefer serializeCvPreviewHtml (async) */
export const serializeCVPreview = serializeCvPreviewHtml;

export default serializeCvPreviewHtml;
