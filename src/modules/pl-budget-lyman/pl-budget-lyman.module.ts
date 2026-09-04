import { Module } from '@nestjs/common';
import { PlBudgetLymanController } from './pl-budget-lyman.controller';
import { PlBudgetLymanService } from './pl-budget-lyman.service';

@Module({
  controllers: [PlBudgetLymanController],
  providers: [PlBudgetLymanService],
  exports: [PlBudgetLymanService],
})
export class PlBudgetLymanModule {}
