import { FEATURE_GATE_KEY } from '../../../common/decorators';
import { CvExportController } from './export.controller';

describe('CvExportController feature gates', () => {
  it('requires downloadPDF for sync render', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvExportController.prototype.renderPdf)).toBe(
      'downloadPDF'
    );
  });

  it('requires downloadPDF for batch export', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvExportController.prototype.batchExport)).toBe(
      'downloadPDF'
    );
  });
});
