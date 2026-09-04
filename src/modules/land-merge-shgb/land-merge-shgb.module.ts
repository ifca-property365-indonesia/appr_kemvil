import { Module } from '@nestjs/common';
import { LandMergeShgbController } from './land-merge-shgb.controller';
import { LandMergeShgbService } from './land-merge-shgb.service';

@Module({
  controllers: [LandMergeShgbController],
  providers: [LandMergeShgbService],
  exports: [LandMergeShgbService],
})
export class LandMergeShgbModule {}
