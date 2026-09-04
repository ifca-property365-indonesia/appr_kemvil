import { Module } from '@nestjs/common';
import { LandRequestController } from './land-request.controller';
import { LandRequestService } from './land-request.service';

@Module({
  controllers: [LandRequestController],
  providers: [LandRequestService],
  exports: [LandRequestService],
})
export class LandRequestModule {}
