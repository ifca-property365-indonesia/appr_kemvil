import { Module } from '@nestjs/common';
import { CbRpbController } from './cb-rpb.controller';
import { CbRpbService } from './cb-rpb.service';

@Module({
  controllers: [CbRpbController],
  providers: [CbRpbService],
  exports: [CbRpbService],
})
export class CbRpbModule {}
