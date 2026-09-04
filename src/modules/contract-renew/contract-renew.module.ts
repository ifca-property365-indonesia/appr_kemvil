import { Module } from '@nestjs/common';
import { ContractRenewController } from './contract-renew.controller';
import { ContractRenewService } from './contract-renew.service';

@Module({
  controllers: [ContractRenewController],
  providers: [ContractRenewService],
  exports: [ContractRenewService],
})
export class ContractRenewModule {}
