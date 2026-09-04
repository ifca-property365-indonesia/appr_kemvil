import { Module } from '@nestjs/common';
import { LandHandoverShgbController } from './land-handover-shgb.controller';
import { LandHandoverShgbService } from './land-handover-shgb.service';

@Module({
  controllers: [LandHandoverShgbController],
  providers: [LandHandoverShgbService],
  exports: [LandHandoverShgbService],
})
export class LandHandoverShgbModule {}
