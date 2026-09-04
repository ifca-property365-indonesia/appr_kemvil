import { Module } from '@nestjs/common';
import { LandBoundaryController } from './land-boundary.controller';
import { LandBoundaryService } from './land-boundary.service';

@Module({
  controllers: [LandBoundaryController],
  providers: [LandBoundaryService],
  exports: [LandBoundaryService],
})
export class LandBoundaryModule {}
