import { Module } from '@nestjs/common';
import { AutoSendTestController } from './auto-send-test.controller';
import { AutoSendTestService } from './auto-send-test.service';

@Module({
  controllers: [AutoSendTestController],
  providers: [AutoSendTestService],
  exports: [AutoSendTestService],
})
export class AutoSendTestModule {}
