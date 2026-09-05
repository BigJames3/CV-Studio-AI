import { FEATURE_GATE_KEY } from '../../common/guards/feature-gate.guard';
import { CvsController } from './cvs.controller';
import { CvExportController } from './export/export.controller';

describe('protected CV endpoints metadata', () => {
  it('GET share requires FeatureGate share', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvsController.prototype.share)).toBe('share');
  });

  it('GET export/pdf requires FeatureGate downloadPDF', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvsController.prototype.exportPdf)).toBe(
      'downloadPDF'
    );
  });

  it('POST export/pdf requires FeatureGate downloadPDF', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvExportController.prototype.renderPdf)).toBe(
      'downloadPDF'
    );
  });

  it('POST export/pdf/batch requires FeatureGate downloadPDF', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvExportController.prototype.batchExport)).toBe(
      'downloadPDF'
    );
  });

  it('create stays service-gated (count) without FeatureGate metadata', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvsController.prototype.create)).toBeUndefined();
  });

  it('unpublish path is not FeatureGate-blocked at controller', () => {
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, CvsController.prototype.publish)).toBeUndefined();
  });
});
