import { Module } from '@nestjs/common';
import { LandHandoverLegalController } from './land-handover-legal.controller';
import { LandHandoverLegalService } from './land-handover-legal.service';

@Module({
  controllers: [LandHandoverLegalController],
  providers: [LandHandoverLegalService],
  exports: [LandHandoverLegalService],
})
export class LandHandoverLegalModule {}
