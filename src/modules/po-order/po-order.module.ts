import { Module } from '@nestjs/common';
import { PoOrderController } from './po-order.controller';
import { PoOrderService } from './po-order.service';

@Module({
  controllers: [PoOrderController],
  providers: [PoOrderService],
  exports: [PoOrderService],
})
export class PoOrderModule {}
