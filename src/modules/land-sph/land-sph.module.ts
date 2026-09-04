import { Module } from '@nestjs/common';
import { LandSphController } from './land-sph.controller';
import { LandSphService } from './land-sph.service';

@Module({
  controllers: [LandSphController],
  providers: [LandSphService],
  exports: [LandSphService],
})
export class LandSphModule {}
