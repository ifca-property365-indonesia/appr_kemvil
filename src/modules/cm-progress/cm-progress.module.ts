import { Module } from '@nestjs/common';
import { CmProgressController } from './cm-progress.controller';
import { CmProgressService } from './cm-progress.service';

@Module({
  controllers: [CmProgressController],
  providers: [CmProgressService],
  exports: [CmProgressService],
})
export class CmProgressModule {}
