import { Module } from '@nestjs/common';
import { LandSftBphtbController } from './land-sft-bphtb.controller';
import { LandSftBphtbService } from './land-sft-bphtb.service';

@Module({
  controllers: [LandSftBphtbController],
  providers: [LandSftBphtbService],
  exports: [LandSftBphtbService],
})
export class LandSftBphtbModule {}
