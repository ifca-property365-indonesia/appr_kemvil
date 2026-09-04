import { Module } from '@nestjs/common';
import { PlOverwriteController } from './pl-overwrite.controller';
import { PlOverwriteService } from './pl-overwrite.service';

@Module({
  controllers: [PlOverwriteController],
  providers: [PlOverwriteService],
  exports: [PlOverwriteService],
})
export class PlOverwriteModule {}
