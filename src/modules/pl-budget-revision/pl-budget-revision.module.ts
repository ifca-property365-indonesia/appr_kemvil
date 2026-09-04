import { Module } from '@nestjs/common';
import { PlBudgetRevisionController } from './pl-budget-revision.controller';
import { PlBudgetRevisionService } from './pl-budget-revision.service';

@Module({
  controllers: [PlBudgetRevisionController],
  providers: [PlBudgetRevisionService],
  exports: [PlBudgetRevisionService],
})
export class PlBudgetRevisionModule {}
