import { Module } from '@nestjs/common';
import { CmProgresswuController } from './cm-progresswu.controller';
import { CmProgresswuService } from './cm-progresswu.service';

@Module({
  controllers: [CmProgresswuController],
  providers: [CmProgresswuService],
  exports: [CmProgresswuService],
})
export class CmProgresswuModule {}
