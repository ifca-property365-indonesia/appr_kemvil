import { Module } from '@nestjs/common';
import { CbPpuVvipController } from './cb-ppu-vvip.controller';
import { CbPpuVvipService } from './cb-ppu-vvip.service';

@Module({
  controllers: [CbPpuVvipController],
  providers: [CbPpuVvipService],
  exports: [CbPpuVvipService],
})
export class CbPpuVvipModule {}
