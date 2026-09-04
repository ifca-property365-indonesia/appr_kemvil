import { Module } from '@nestjs/common';
import { LandSplitShgbController } from './land-split-shgb.controller';
import { LandSplitShgbService } from './land-split-shgb.service';

@Module({
  controllers: [LandSplitShgbController],
  providers: [LandSplitShgbService],
  exports: [LandSplitShgbService],
})
export class LandSplitShgbModule {}
