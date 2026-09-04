import { Module } from '@nestjs/common';
import { PoRequestController } from './po-request.controller';
import { PoRequestService } from './po-request.service';

@Module({
  controllers: [PoRequestController],
  providers: [PoRequestService],
  exports: [PoRequestService],
})
export class PoRequestModule {}
