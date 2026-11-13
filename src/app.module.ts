import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import configuration from './common/config/configuration';
import { ApprListModule } from './modules/appr-list/appr-list.module';
import { PoRequestModule } from './modules/po-request/po-request.module';
import { QrCodeModule } from './modules/qr-code/qr-code.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    CommonModule,

    PoRequestModule,
    ApprListModule,
    QrCodeModule,
    SystemModule,
  ],
})
export class AppModule {}
