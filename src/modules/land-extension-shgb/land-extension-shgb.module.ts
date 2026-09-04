import { Module } from '@nestjs/common';
import { LandExtensionShgbController } from './land-extension-shgb.controller';
import { LandExtensionShgbService } from './land-extension-shgb.service';

@Module({
  controllers: [LandExtensionShgbController],
  providers: [LandExtensionShgbService],
  exports: [LandExtensionShgbService],
})
export class LandExtensionShgbModule {}
