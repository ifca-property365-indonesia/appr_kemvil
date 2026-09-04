import { Module } from '@nestjs/common';
import { LandMasterController } from './land-master.controller';
import { LandMasterService } from './land-master.service';

@Module({
  controllers: [LandMasterController],
  providers: [LandMasterService],
  exports: [LandMasterService],
})
export class LandMasterModule {}
