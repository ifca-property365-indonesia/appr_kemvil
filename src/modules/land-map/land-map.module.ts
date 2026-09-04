import { Module } from '@nestjs/common';
import { LandMapController } from './land-map.controller';
import { LandMapService } from './land-map.service';

@Module({
  controllers: [LandMapController],
  providers: [LandMapService],
  exports: [LandMapService],
})
export class LandMapModule {}
