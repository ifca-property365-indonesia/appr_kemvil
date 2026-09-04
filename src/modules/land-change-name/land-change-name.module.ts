import { Module } from '@nestjs/common';
import { LandChangeNameController } from './land-change-name.controller';
import { LandChangeNameService } from './land-change-name.service';

@Module({
  controllers: [LandChangeNameController],
  providers: [LandChangeNameService],
  exports: [LandChangeNameService],
})
export class LandChangeNameModule {}
