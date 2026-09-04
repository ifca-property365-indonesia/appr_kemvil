import { Module } from '@nestjs/common';
import { PurchaseSelectionController } from './purchase-selection.controller';
import { PurchaseSelectionService } from './purchase-selection.service';

@Module({
  controllers: [PurchaseSelectionController],
  providers: [PurchaseSelectionService],
  exports: [PurchaseSelectionService],
})
export class PurchaseSelectionModule {}
