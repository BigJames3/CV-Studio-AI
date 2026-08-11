import { Module } from '@nestjs/common';
import { CvsController } from './cvs.controller';
import { PublicCvsController } from './public-cvs.controller';
import { CvsService } from './cvs.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CvExportController } from './export/export.controller';
import { PdfExportService } from './export/pdf-export.service';
import { PdfBrowserPool, PdfGeneratorService } from './export/pdf-generator.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [CvExportController, PublicCvsController, CvsController],
  providers: [CvsService, PdfExportService, PdfGeneratorService, PdfBrowserPool],
  exports: [CvsService, PdfExportService],
})
export class CvsModule {}
