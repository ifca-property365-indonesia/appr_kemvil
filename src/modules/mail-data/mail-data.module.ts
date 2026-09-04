import { Module } from '@nestjs/common';
import { CbFupdModule } from '../cb-fupd/cb-fupd.module';
import { CbPpuModule } from '../cb-ppu/cb-ppu.module';
import { CbPpuVvipModule } from '../cb-ppu-vvip/cb-ppu-vvip.module';
import { CbRpbModule } from '../cb-rpb/cb-rpb.module';
import { CbRumModule } from '../cb-rum/cb-rum.module';
import { CmCloseModule } from '../cm-close/cm-close.module';
import { CmDoneModule } from '../cm-done/cm-done.module';
import { CmEntryModule } from '../cm-entry/cm-entry.module';
import { CmProgressModule } from '../cm-progress/cm-progress.module';
import { CmProgresswuModule } from '../cm-progresswu/cm-progresswu.module';
import { ContractRenewModule } from '../contract-renew/contract-renew.module';
import { LandSubmissionModule } from '../land-submission/land-submission.module';
import { PlBudgetLymanModule } from '../pl-budget-lyman/pl-budget-lyman.module';
import { PlBudgetRevisionModule } from '../pl-budget-revision/pl-budget-revision.module';
import { PoOrderModule } from '../po-order/po-order.module';
import { PoRequestModule } from '../po-request/po-request.module';
import { PurchaseSelectionModule } from '../purchase-selection/purchase-selection.module';
import { VarianOrderModule } from '../varian-order/varian-order.module';
import { MailDataController } from './mail-data.controller';
import { MailDataService } from './mail-data.service';

@Module({
  imports: [
    CbFupdModule,
    CbPpuModule,
    CbPpuVvipModule,
    CbRpbModule,
    CbRumModule,
    CmCloseModule,
    CmDoneModule,
    CmEntryModule,
    CmProgressModule,
    CmProgresswuModule,
    ContractRenewModule,
    LandSubmissionModule,
    PlBudgetLymanModule,
    PlBudgetRevisionModule,
    PoOrderModule,
    PoRequestModule,
    PurchaseSelectionModule,
    VarianOrderModule,
  ],
  controllers: [MailDataController],
  providers: [MailDataService],
})
export class MailDataModule {}
