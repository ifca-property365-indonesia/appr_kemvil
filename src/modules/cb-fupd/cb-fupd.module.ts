import { Module } from '@nestjs/common';
import { CbFupdController } from './cb-fupd.controller';
import { CbFupdService } from './cb-fupd.service';

@Module({
  controllers: [CbFupdController],
  providers: [CbFupdService],
  exports: [CbFupdService],
})
export class CbFupdModule {}
