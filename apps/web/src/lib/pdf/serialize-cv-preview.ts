/**
 * Serialize the live CV preview into a standalone HTML document for the PDF service.
 *
 * The CV markup is kept as rendered (templates are styled inline), so the PDF uses exactly the
 * same layout rules as the preview and the browser print: same widths, same page-break rules,
 * same paged-media CSS (see `PAGED_MEDIA_CSS`). What the PDF service cannot fetch is embedded:
 * the stylesheet rules that apply to the CV, its fonts and its images. The service blocks all
 * network requests except data: URLs.
 */
import { PAPER_SIZES, type PaperSize } from '@/lib/templates/page-layout';

const NO_PRINT_SELECTORS = [
  '.editor-controls',
  '.sidebar',
  '[data-no-print]',
  'button',
  'input',
  'textarea',
  '[role="toolbar"]',
] as const;

/** Inherited properties the CV takes from the page around the preview. */
const INHERITED_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'color',
  'text-align',
  '-webkit-font-smoothing',
] as const;

function absoluteUrl(url: string, base = window.location.href): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function removeInteractiveElements(element: HTMLElement): void {
  for (const selector of NO_PRINT_SELECTORS) {
    element.querySelectorAll(selector).forEach((el) => el.remove());
  }
}

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
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
        img.src = await toDataUrl(absoluteUrl(src));
        img.removeAttribute('srcset');
      } catch (error) {
        console.warn('Failed to inline image for PDF:', src, error);
      }
    })
  );

  // Inline style background-image: url(...) → data URL where possible
  const withBg = Array.from(element.querySelectorAll<HTMLElement>('[style*="url("]'));
  await Promise.all(
    withBg.map(async (el) => {
      const match = el.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (!match?.[1] || match[1].startsWith('data:')) return;
      try {
        const dataUrl = await toDataUrl(absoluteUrl(match[1]));
        el.style.backgroundImage = el.style.backgroundImage.replace(match[0], `url("${dataUrl}")`);
      } catch {
        /* keep original */
      }
    })
  );
}

function normalizeFamily(family: string): string {
  return family
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
}

type FontUsage = {
  /** Resolved family (e.g. `__inter_d65c78`) → font weights rendered with it. */
  weights: Map<string, Set<number>>;
  /** Code points of the CV text, in both cases (text-transform may change them). */
  codePoints: Set<number>;
};

/** Families, weights and characters the CV actually renders. */
function fontUsage(root: HTMLElement): FontUsage {
  const weights = new Map<string, Set<number>>();
  for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]) {
    const style = window.getComputedStyle(el);
    const weight = Number(style.fontWeight) || 400;
    for (const family of style.fontFamily.split(',')) {
      const key = normalizeFamily(family);
      if (!weights.has(key)) weights.set(key, new Set());
      weights.get(key)!.add(weight);
    }
  }
  const text = root.textContent ?? '';
  const codePoints = new Set<number>();
  for (const char of text + text.toUpperCase() + text.toLowerCase()) {
    codePoints.add(char.codePointAt(0)!);
  }
  return { weights, codePoints };
}

/** `U+0-FF, U+131, U+4??` → does it cover any of the code points? No range covers all. */
function coversText(unicodeRange: string, codePoints: Set<number>): boolean {
  if (!unicodeRange.trim()) return true;
  const ranges = unicodeRange.split(',').map((part) => {
    const value = part.trim().replace(/^u\+/i, '');
    if (value.includes('?')) {
      return [parseInt(value.replace(/\?/g, '0'), 16), parseInt(value.replace(/\?/g, 'F'), 16)];
    }
    const [from, to = from] = value.split('-');
    return [parseInt(from!, 16), parseInt(to!, 16)];
  });
  for (const point of codePoints) {
    if (ranges.some(([from, to]) => point >= from! && point <= to!)) return true;
  }
  return false;
}

/** `400` or `100 900` (variable font) → does it include one of the weights used? */
function coversWeight(fontWeight: string, used: Set<number>): boolean {
  const [from, to = from] = fontWeight
    .split(/\s+/)
    .map((w) => (w === 'bold' ? 700 : w === 'normal' || !w ? 400 : Number(w)));
  return Array.from(used).some((w) => w >= from! && w <= to!);
}

/**
 * The @font-face rules to embed: the CV's families, only for the scripts its text uses and the
 * weights it renders. A family whose weights match no face keeps all its faces (the browser
 * then picks the nearest one, as in the preview).
 */
function facesToEmbed(faces: CSSFontFaceRule[], usage: FontUsage): CSSFontFaceRule[] {
  const used = faces.filter((face) =>
    usage.weights.has(normalizeFamily(face.style.getPropertyValue('font-family')))
  );
  const inText = used.filter((face) =>
    coversText(face.style.getPropertyValue('unicode-range'), usage.codePoints)
  );
  const byFamily = new Map<string, CSSFontFaceRule[]>();
  for (const face of inText) {
    const family = normalizeFamily(face.style.getPropertyValue('font-family'));
    byFamily.set(family, [...(byFamily.get(family) ?? []), face]);
  }
  return Array.from(byFamily.entries()).flatMap(([family, list]) => {
    const weights = usage.weights.get(family)!;
    const matching = list.filter((face) =>
      coversWeight(face.style.getPropertyValue('font-weight'), weights)
    );
    return matching.length ? matching : list;
  });
}

function ruleApplies(selector: string, source: HTMLElement): boolean {
  try {
    return (
      source.matches(selector) ||
      source.querySelector(selector) !== null ||
      document.documentElement.matches(selector) ||
      document.body.matches(selector)
    );
  } catch {
    return false; // pseudo-element-only or unsupported selector
  }
}

async function inlineFontFace(rule: CSSFontFaceRule, base: string): Promise<string> {
  let css = rule.cssText;
  const urls = Array.from(css.matchAll(/url\(["']?([^"')]+)["']?\)/g));
  for (const [match, url] of urls) {
    try {
      css = css.replace(match, `url("${await toDataUrl(absoluteUrl(url, base))}")`);
    } catch (error) {
      console.warn('Failed to inline font for PDF:', url, error);
    }
  }
  return css;
}

/**
 * Stylesheet rules that apply to the CV (preflight resets, font variables on html/body…) and
 * the @font-face rules of the families it uses, with their files embedded. Rules nested in
 * at-rules are skipped: templates are styled inline and carry their own print rules.
 */
async function collectCvCss(source: HTMLElement): Promise<string> {
  const rules: string[] = [];
  const faces: Array<{ rule: CSSFontFaceRule; base: string }> = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    const base = sheet.href ?? window.location.href;
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSFontFaceRule) {
        faces.push({ rule, base });
      } else if (rule instanceof CSSStyleRule && ruleApplies(rule.selectorText, source)) {
        rules.push(rule.cssText);
      }
    }
  }
  const embedded = facesToEmbed(
    faces.map((f) => f.rule),
    fontUsage(source)
  );
  const fontCss = await Promise.all(
    faces.filter((f) => embedded.includes(f.rule)).map((f) => inlineFontFace(f.rule, f.base))
  );
  return [...fontCss, ...rules].join('\n');
}

function inheritedStyle(source: HTMLElement): string {
  const parent = window.getComputedStyle(source.parentElement ?? document.body);
  return INHERITED_PROPS.map((prop) => `${prop}:${parent.getPropertyValue(prop)}`).join(';');
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
  pageSize?: PaperSize;
  title?: string;
  selector?: string;
};

/**
 * Capture `[data-cv-preview]` (TemplateWrapper) as standalone HTML for Puppeteer WYSIWYG export.
 */
export async function serializeCvPreviewHtml(options: SerializeCvOptions = {}): Promise<string> {
  const pageSize = options.pageSize ?? 'A4';
  const paper = PAPER_SIZES[pageSize];
  const source = findPreviewElement(options.selector ?? '[data-cv-preview]');

  const clone = source.cloneNode(true) as HTMLElement;
  removeInteractiveElements(clone);
  // Editor layout classes (zoom, shadow) belong to the editor, not to the CV.
  clone.removeAttribute('class');
  clone.setAttribute('data-cv-export', '1');
  clone.style.setProperty('--cv-paper-height', paper.height);
  await inlineImages(clone);
  const css = await collectCvCss(source);

  const htmlClass = escapeHtml(document.documentElement.className);
  const bodyClass = escapeHtml(document.body.className);
  const rootFontSize = window.getComputedStyle(document.documentElement).fontSize;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(document.documentElement.lang || 'fr')}" class="${htmlClass}" style="font-size:${rootFontSize}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title || 'CV')}</title>
<style>
${css}
</style>
<style>
  @page { size: ${paper.css}; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${paper.width};
    background: #ffffff !important;
  }
  [data-cv-export] {
    width: ${paper.width} !important;
    min-height: ${paper.height} !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    transform: none !important;
    overflow: visible !important;
  }
</style>
</head>
<body class="${bodyClass}" style="${escapeHtml(inheritedStyle(source))}">${clone.outerHTML}</body>
</html>`;
}

/** @deprecated Prefer serializeCvPreviewHtml (async) */
export const serializeCVPreview = serializeCvPreviewHtml;

export default serializeCvPreviewHtml;
