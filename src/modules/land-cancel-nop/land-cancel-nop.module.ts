import { Module } from '@nestjs/common';
import { LandCancelNopController } from './land-cancel-nop.controller';
import { LandCancelNopService } from './land-cancel-nop.service';

@Module({
  controllers: [LandCancelNopController],
  providers: [LandCancelNopService],
  exports: [LandCancelNopService],
})
export class LandCancelNopModule {}
