import { Module } from '@nestjs/common';
import { ApprListController } from './appr-list.controller';
import { ApprListService } from './appr-list.service';

@Module({
  controllers: [ApprListController],
  providers: [ApprListService],
  exports: [ApprListService],
})
export class ApprListModule {}
