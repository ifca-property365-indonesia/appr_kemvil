import { Module } from '@nestjs/common';
import { VarianOrderController } from './varian-order.controller';
import { VarianOrderService } from './varian-order.service';

@Module({
  controllers: [VarianOrderController],
  providers: [VarianOrderService],
  exports: [VarianOrderService],
})
export class VarianOrderModule {}
