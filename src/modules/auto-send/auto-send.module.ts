import { Module } from '@nestjs/common';
import { AutoSendController } from './auto-send.controller';
import { AutoSendService } from './auto-send.service';

@Module({
  controllers: [AutoSendController],
  providers: [AutoSendService],
  exports: [AutoSendService],
})
export class AutoSendModule {}
