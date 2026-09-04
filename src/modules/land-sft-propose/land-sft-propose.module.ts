import { Module } from '@nestjs/common';
import { LandSftProposeController } from './land-sft-propose.controller';
import { LandSftProposeService } from './land-sft-propose.service';

@Module({
  controllers: [LandSftProposeController],
  providers: [LandSftProposeService],
  exports: [LandSftProposeService],
})
export class LandSftProposeModule {}
