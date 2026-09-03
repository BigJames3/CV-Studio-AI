import { shouldAllowPdfNetworkRequest } from './pdf-generator.service';
import { IS_PUBLIC_KEY } from '../../../common/decorators';
import { CvExportController } from './export.controller';

describe('shouldAllowPdfNetworkRequest', () => {
  it('allows data, about, and blob URLs', () => {
    expect(shouldAllowPdfNetworkRequest('data:text/html,hi')).toBe(true);
    expect(shouldAllowPdfNetworkRequest('about:blank')).toBe(true);
    expect(shouldAllowPdfNetworkRequest('blob:https://cvstudio.ai/x')).toBe(true);
  });

  it('blocks http(s) and file URLs (SSRF)', () => {
    expect(shouldAllowPdfNetworkRequest('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(shouldAllowPdfNetworkRequest('http://127.0.0.1/')).toBe(false);
    expect(shouldAllowPdfNetworkRequest('file:///etc/passwd')).toBe(false);
  });
});

describe('CvExportController auth', () => {
  it('does not mark renderPdf as @Public()', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, CvExportController.prototype.renderPdf) as
      boolean | undefined;
    expect(isPublic).toBeFalsy();
  });
});
