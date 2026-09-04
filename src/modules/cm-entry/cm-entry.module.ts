import { Module } from '@nestjs/common';
import { CmEntryController } from './cm-entry.controller';
import { CmEntryService } from './cm-entry.service';

@Module({
  controllers: [CmEntryController],
  providers: [CmEntryService],
  exports: [CmEntryService],
})
export class CmEntryModule {}
