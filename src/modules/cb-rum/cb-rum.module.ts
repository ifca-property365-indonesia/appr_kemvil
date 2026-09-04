import { Module } from '@nestjs/common';
import { CbRumController } from './cb-rum.controller';
import { CbRumService } from './cb-rum.service';

@Module({
  controllers: [CbRumController],
  providers: [CbRumService],
  exports: [CbRumService],
})
export class CbRumModule {}
