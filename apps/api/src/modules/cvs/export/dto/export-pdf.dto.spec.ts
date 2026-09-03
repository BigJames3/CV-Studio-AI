import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExportPdfDto, PDF_HTML_MAX_CHARS } from './export-pdf.dto';

describe('ExportPdfDto', () => {
  it('accepts html under the size cap', async () => {
    const dto = plainToInstance(ExportPdfDto, { html: '<html></html>' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects html over the size cap', async () => {
    const dto = plainToInstance(ExportPdfDto, {
      html: 'x'.repeat(PDF_HTML_MAX_CHARS + 1),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'html')).toBe(true);
  });

  it('requires neither field at DTO layer (controller enforces html|content)', async () => {
    const dto = plainToInstance(ExportPdfDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });
});
