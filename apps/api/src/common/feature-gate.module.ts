import { Global, Module } from '@nestjs/common';
import { FeatureGateService } from './services/feature-gate.service';
import { AuditLogService } from './services/audit-log.service';
import { FeatureGateGuard } from './guards/feature-gate.guard';

@Global()
@Module({
  providers: [FeatureGateService, AuditLogService, FeatureGateGuard],
  exports: [FeatureGateService, AuditLogService, FeatureGateGuard],
})
export class FeatureGateModule {}
