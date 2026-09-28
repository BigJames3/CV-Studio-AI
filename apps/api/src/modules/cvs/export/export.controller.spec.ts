import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CvExportController } from './export.controller';

describe('CvExportController.renderPdf errors', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs the internal error but never returns it to the client', async () => {
    const internal = new Error(
      'Browser was not found at the configured executablePath (/usr/local/bin/cv-chrome)'
    );
    const exportService = { renderFromContent: jest.fn().mockRejectedValue(internal) };
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const controller = new CvExportController(exportService as never);

    const error = await controller
      .renderPdf({ html: '<p>cv</p>' } as never, { id: 'user-1' } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.stringify((error as HttpException).getResponse());
    expect(body).toContain('Failed to generate PDF');
    expect(body).not.toContain('executablePath');
    expect(body).not.toContain('/usr/local/bin');
    expect(logged).toHaveBeenCalledWith('PDF render failed', internal.stack);
  });
});
