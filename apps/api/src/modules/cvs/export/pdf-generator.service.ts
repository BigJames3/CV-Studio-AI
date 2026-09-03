import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, PDFOptions } from 'puppeteer-core';
import type { ExportPdfOptions, PdfQuality } from './pdf-content.types';

type LaunchFn = (options?: Record<string, unknown>) => Promise<Browser>;

@Injectable()
export class PdfBrowserPool implements OnModuleDestroy {
  private readonly logger = new Logger(PdfBrowserPool.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    if (this.launching) return this.launching;

    this.launching = this.launch().finally(() => {
      this.launching = null;
    });
    this.browser = await this.launching;
    return this.browser;
  }

  private async launch(): Promise<Browser> {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH || undefined;

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--font-render-hinting=medium',
    ];

    let launch: LaunchFn;
    try {
      // Prefer full puppeteer (bundled Chromium) in local/dev
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require('puppeteer') as { launch: LaunchFn };
      launch = puppeteer.launch.bind(puppeteer);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const core = require('puppeteer-core') as { launch: LaunchFn };
      launch = core.launch.bind(core);
      if (!executablePath) {
        throw new Error(
          'No Chromium available. Install puppeteer or set PUPPETEER_EXECUTABLE_PATH'
        );
      }
    }

    this.logger.log(`Launching Chromium${executablePath ? ` at ${executablePath}` : ' (bundled)'}`);

    const browser = await launch({
      headless: true,
      executablePath,
      args,
    });

    browser.on('disconnected', () => {
      this.browser = null;
    });

    return browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(private readonly pool: PdfBrowserPool) {}

  async htmlToPdf(html: string, options: ExportPdfOptions = {}): Promise<Buffer> {
    const browser = await this.pool.getBrowser();
    const page = await browser.newPage();

    try {
      page.setDefaultTimeout(15_000);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (shouldAllowPdfNetworkRequest(request.url())) {
          void request.continue();
          return;
        }
        void request.abort();
      });

      const pageSize = options.pageSize ?? 'A4';
      const viewport =
        pageSize === 'Letter'
          ? { width: 816, height: 1056, deviceScaleFactor: 2 }
          : { width: 794, height: 1123, deviceScaleFactor: 2 };
      await page.setViewport(viewport);

      // WYSIWYG HTML already has inlined styles/images; still wait for fonts
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      await page.evaluateHandle('document.fonts.ready').catch(() => undefined);

      const pdfOpts = this.toPdfOptions(options);
      const buffer = await page.pdf(pdfOpts);
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error('htmlToPdf failed', error instanceof Error ? error.stack : error);
      throw error;
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private toPdfOptions(options: ExportPdfOptions): PDFOptions {
    const wysiwyg = options.wysiwyg === true || Boolean(options.html);
    const marginMm = wysiwyg ? 0 : (options.marginMm ?? 12);
    const quality = options.quality ?? 'standard';
    const footerName = options.filename?.replace(/\.pdf$/i, '') || 'CV';
    const site = options.siteUrl ?? '';

    // WYSIWYG must stay at 100% to avoid gaps/shifts vs the editor preview
    const scale = wysiwyg ? 1 : qualityScale(quality);
    const showChrome =
      !wysiwyg && (options.includeFooter !== false || options.includeHeader !== false);

    return {
      format: options.pageSize ?? 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      scale,
      margin: {
        top: wysiwyg ? '0' : `${marginMm + (options.includeHeader !== false ? 8 : 0)}mm`,
        bottom: wysiwyg ? '0' : `${marginMm + (options.includeFooter !== false ? 12 : 0)}mm`,
        left: `${marginMm}mm`,
        right: `${marginMm}mm`,
      },
      displayHeaderFooter: showChrome,
      headerTemplate:
        showChrome && options.includeHeader !== false
          ? `<div style="font-size:8px;width:100%;padding:0 12mm;color:#94a3b8;display:flex;justify-content:space-between;">
              <span>${escapeFooter(footerName)}</span>
              <span>${escapeFooter(site)}</span>
            </div>`
          : '<div></div>',
      footerTemplate:
        showChrome && options.includeFooter !== false
          ? `<div style="font-size:8px;width:100%;padding:0 12mm;color:#94a3b8;display:flex;justify-content:space-between;">
              <span>${escapeFooter(footerName)}</span>
              <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
            </div>`
          : '<div></div>',
    };
  }
}

function qualityScale(quality: PdfQuality): number {
  switch (quality) {
    case 'draft':
      return 0.85;
    case 'high':
      return 1;
    default:
      return 0.95;
  }
}

/** Block SSRF: Chromium may only load in-document / data URLs. */
export function shouldAllowPdfNetworkRequest(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:');
}

function escapeFooter(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
