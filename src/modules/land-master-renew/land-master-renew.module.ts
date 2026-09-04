import { Module } from '@nestjs/common';
import { LandMasterRenewController } from './land-master-renew.controller';
import { LandMasterRenewService } from './land-master-renew.service';

@Module({
  controllers: [LandMasterRenewController],
  providers: [LandMasterRenewService],
  exports: [LandMasterRenewService],
})
export class LandMasterRenewModule {}
