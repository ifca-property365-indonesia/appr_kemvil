import { Module } from '@nestjs/common';
import { CbPpuController } from './cb-ppu.controller';
import { CbPpuService } from './cb-ppu.service';

@Module({
  controllers: [CbPpuController],
  providers: [CbPpuService],
  exports: [CbPpuService],
})
export class CbPpuModule {}
