import { Module } from '@nestjs/common';
import { CmCloseController } from './cm-close.controller';
import { CmCloseService } from './cm-close.service';

@Module({
  controllers: [CmCloseController],
  providers: [CmCloseService],
  exports: [CmCloseService],
})
export class CmCloseModule {}
