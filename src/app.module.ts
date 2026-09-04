import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import configuration from './common/config/configuration';

// ---- Approval List & dispatcher -------------------------------------------
import { ApprListModule } from './modules/appr-list/appr-list.module';
import { MailDataModule } from './modules/mail-data/mail-data.module';

// ---- CB --------------------------------------------------------------------
import { CbFupdModule } from './modules/cb-fupd/cb-fupd.module';
import { CbPpuModule } from './modules/cb-ppu/cb-ppu.module';
import { CbPpuVvipModule } from './modules/cb-ppu-vvip/cb-ppu-vvip.module';
import { CbRpbModule } from './modules/cb-rpb/cb-rpb.module';
import { CbRumModule } from './modules/cb-rum/cb-rum.module';

// ---- CM --------------------------------------------------------------------
import { CmCloseModule } from './modules/cm-close/cm-close.module';
import { CmDoneModule } from './modules/cm-done/cm-done.module';
import { CmEntryModule } from './modules/cm-entry/cm-entry.module';
import { CmProgressModule } from './modules/cm-progress/cm-progress.module';
import { CmProgresswuModule } from './modules/cm-progresswu/cm-progresswu.module';
import { VarianOrderModule } from './modules/varian-order/varian-order.module';

// ---- PO --------------------------------------------------------------------
import { PoOrderModule } from './modules/po-order/po-order.module';
import { PoRequestModule } from './modules/po-request/po-request.module';
import { PurchaseSelectionModule } from './modules/purchase-selection/purchase-selection.module';

// ---- PL --------------------------------------------------------------------
import { PlBudgetLymanModule } from './modules/pl-budget-lyman/pl-budget-lyman.module';
import { PlBudgetRevisionModule } from './modules/pl-budget-revision/pl-budget-revision.module';
import { PlOverwriteModule } from './modules/pl-overwrite/pl-overwrite.module';

// ---- TM --------------------------------------------------------------------
import { ContractRenewModule } from './modules/contract-renew/contract-renew.module';

// ---- Land ------------------------------------------------------------------
import { LandBoundaryModule } from './modules/land-boundary/land-boundary.module';
import { LandCancelNopModule } from './modules/land-cancel-nop/land-cancel-nop.module';
import { LandChangeNameModule } from './modules/land-change-name/land-change-name.module';
import { LandExtensionShgbModule } from './modules/land-extension-shgb/land-extension-shgb.module';
import { LandFphModule } from './modules/land-fph/land-fph.module';
import { LandHandoverLegalModule } from './modules/land-handover-legal/land-handover-legal.module';
import { LandHandoverShgbModule } from './modules/land-handover-shgb/land-handover-shgb.module';
import { LandMapModule } from './modules/land-map/land-map.module';
import { LandMasterModule } from './modules/land-master/land-master.module';
import { LandMasterRenewModule } from './modules/land-master-renew/land-master-renew.module';
import { LandMeasuringModule } from './modules/land-measuring/land-measuring.module';
import { LandMeasuringSftModule } from './modules/land-measuring-sft/land-measuring-sft.module';
import { LandMergeShgbModule } from './modules/land-merge-shgb/land-merge-shgb.module';
import { LandRequestModule } from './modules/land-request/land-request.module';
import { LandSftBphtbModule } from './modules/land-sft-bphtb/land-sft-bphtb.module';
import { LandSftProposeModule } from './modules/land-sft-propose/land-sft-propose.module';
import { LandSftShgbModule } from './modules/land-sft-shgb/land-sft-shgb.module';
import { LandSphModule } from './modules/land-sph/land-sph.module';
import { LandSplitShgbModule } from './modules/land-split-shgb/land-split-shgb.module';
import { LandSubmissionModule } from './modules/land-submission/land-submission.module';
import { LandVerificationModule } from './modules/land-verification/land-verification.module';
import { LandVerificationPaymentModule } from './modules/land-verification-payment/land-verification-payment.module';

// ---- Feedback & batch ------------------------------------------------------
import { AutoFeedbackModule } from './modules/auto-feedback/auto-feedback.module';
import { AutoSendModule } from './modules/auto-send/auto-send.module';
import { AutoSendTestModule } from './modules/auto-send-test/auto-send-test.module';
import { CheckFeedbackModule } from './modules/check-feedback/check-feedback.module';
import { FeedbackPlModule } from './modules/feedback-pl/feedback-pl.module';
import { OldFeedbackModule } from './modules/old-feedback/old-feedback.module';
import { StaffActionModule } from './modules/staff-action/staff-action.module';
import { StaffFeedbackModule } from './modules/staff-feedback/staff-feedback.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    CommonModule,

    ApprListModule,
    MailDataModule,

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
    VarianOrderModule,

    PoOrderModule,
    PoRequestModule,
    PurchaseSelectionModule,

    PlBudgetLymanModule,
    PlBudgetRevisionModule,
    PlOverwriteModule,

    ContractRenewModule,

    LandBoundaryModule,
    LandCancelNopModule,
    LandChangeNameModule,
    LandExtensionShgbModule,
    LandFphModule,
    LandHandoverLegalModule,
    LandHandoverShgbModule,
    LandMapModule,
    LandMasterModule,
    LandMasterRenewModule,
    LandMeasuringModule,
    LandMeasuringSftModule,
    LandMergeShgbModule,
    LandRequestModule,
    LandSftBphtbModule,
    LandSftProposeModule,
    LandSftShgbModule,
    LandSphModule,
    LandSplitShgbModule,
    LandSubmissionModule,
    LandVerificationModule,
    LandVerificationPaymentModule,

    AutoFeedbackModule,
    AutoSendModule,
    AutoSendTestModule,
    CheckFeedbackModule,
    FeedbackPlModule,
    OldFeedbackModule,
    StaffActionModule,
    StaffFeedbackModule,
    SystemModule,
  ],
})
export class AppModule {}
