import { Module } from '@nestjs/common';
import { LandMeasuringSftController } from './land-measuring-sft.controller';
import { LandMeasuringSftService } from './land-measuring-sft.service';

@Module({
  controllers: [LandMeasuringSftController],
  providers: [LandMeasuringSftService],
  exports: [LandMeasuringSftService],
})
export class LandMeasuringSftModule {}
