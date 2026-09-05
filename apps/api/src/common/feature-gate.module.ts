import { Global, Module } from '@nestjs/common';
import { FeatureGateService } from './services/feature-gate.service';
import { FeatureGateGuard } from './guards/feature-gate.guard';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({
  providers: [FeatureGateService, FeatureGateGuard, AuditLogService],
  exports: [FeatureGateService, FeatureGateGuard, AuditLogService],
})
export class FeatureGateModule {}
