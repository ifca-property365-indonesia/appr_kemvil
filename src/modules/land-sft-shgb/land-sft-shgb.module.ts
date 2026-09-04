import { Module } from '@nestjs/common';
import { LandSftShgbController } from './land-sft-shgb.controller';
import { LandSftShgbService } from './land-sft-shgb.service';

@Module({
  controllers: [LandSftShgbController],
  providers: [LandSftShgbService],
  exports: [LandSftShgbService],
})
export class LandSftShgbModule {}
