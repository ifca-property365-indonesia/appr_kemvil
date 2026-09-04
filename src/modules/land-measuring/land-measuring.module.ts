import { Module } from '@nestjs/common';
import { LandMeasuringController } from './land-measuring.controller';
import { LandMeasuringService } from './land-measuring.service';

@Module({
  controllers: [LandMeasuringController],
  providers: [LandMeasuringService],
  exports: [LandMeasuringService],
})
export class LandMeasuringModule {}
