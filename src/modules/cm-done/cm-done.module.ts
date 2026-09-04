import { Module } from '@nestjs/common';
import { CmDoneController } from './cm-done.controller';
import { CmDoneService } from './cm-done.service';

@Module({
  controllers: [CmDoneController],
  providers: [CmDoneService],
  exports: [CmDoneService],
})
export class CmDoneModule {}
