import { Injectable } from '@nestjs/common';
import { DocumentApprovalBaseService } from '../../common/base/document-approval.base';
import { TokenService } from '../../common/crypto/token.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalFlowService } from '../../common/services/approval-flow.service';
import { CbFupdService } from '../cb-fupd/cb-fupd.service';
import { CbPpuService } from '../cb-ppu/cb-ppu.service';
import { CbPpuVvipService } from '../cb-ppu-vvip/cb-ppu-vvip.service';
import { CbRpbService } from '../cb-rpb/cb-rpb.service';
import { CbRumService } from '../cb-rum/cb-rum.service';
import { CmCloseService } from '../cm-close/cm-close.service';
import { CmDoneService } from '../cm-done/cm-done.service';
import { CmEntryService } from '../cm-entry/cm-entry.service';
import { CmProgressService } from '../cm-progress/cm-progress.service';
import { CmProgresswuService } from '../cm-progresswu/cm-progresswu.service';
import { ContractRenewService } from '../contract-renew/contract-renew.service';
import { PlBudgetLymanService } from '../pl-budget-lyman/pl-budget-lyman.service';
import { PlBudgetRevisionService } from '../pl-budget-revision/pl-budget-revision.service';
import { PoOrderService } from '../po-order/po-order.service';
import { PoRequestService } from '../po-request/po-request.service';
import { PurchaseSelectionService } from '../purchase-selection/purchase-selection.service';
import { VarianOrderService } from '../varian-order/varian-order.service';

/**
 * Migrasi dari app/Http/Controllers/MailDataController.php
 *
 * Versi Laravel memakai `new ('App\Http\Controllers\' . $module . 'Controller')`
 * untuk memanggil `processModule()` / `update()`. Di NestJS pemetaan itu dibuat
 * eksplisit lewat registry di bawah agar tidak ada instansiasi kelas dinamis.
 */
@Injectable()
export class MailDataService {
  private readonly registry: Record<string, DocumentApprovalBaseService>;

  constructor(
    private readonly token: TokenService,
    private readonly flow: ApprovalFlowService,
    private readonly logger: AppLoggerService,
    cbFupd: CbFupdService,
    cbPpu: CbPpuService,
    cbPpuVvip: CbPpuVvipService,
    cbRpb: CbRpbService,
    cbRum: CbRumService,
    cmClose: CmCloseService,
    cmDone: CmDoneService,
    cmEntry: CmEntryService,
    cmProgress: CmProgressService,
    cmProgresswu: CmProgresswuService,
    contractRenew: ContractRenewService,
    plBudgetLyman: PlBudgetLymanService,
    plBudgetRevision: PlBudgetRevisionService,
    poOrder: PoOrderService,
    poRequest: PoRequestService,
    purchaseSelection: PurchaseSelectionService,
    varianOrder: VarianOrderService,
  ) {
    this.registry = {
      CbFupd: cbFupd,
      CbPpu: cbPpu,
      CbPpuVvip: cbPpuVvip,
      CbPPuVvip: cbPpuVvip,
      CbRpb: cbRpb,
      CbRum: cbRum,
      CmClose: cmClose,
      CmDone: cmDone,
      CmEntry: cmEntry,
      CmProgress: cmProgress,
      CmProgresswu: cmProgresswu,
      ContractRenew: contractRenew,
      PLBudgetLyman: plBudgetLyman,
      PLBudgetRevision: plBudgetRevision,
      PoOrder: poOrder,
      PoRequest: poRequest,
      PurchaseSelection: purchaseSelection,
      VarianOrder: varianOrder,

      // Alias berdasarkan prefix route, dipakai oleh field `module` pada
      // template email/passcheckwithremark yang mem-POST ke /api/getaccess.
      cbfupb: cbFupd,
      poselection: purchaseSelection,
      budgetlyman: plBudgetLyman,
      budgetrevision: plBudgetRevision,
    };
  }

  private resolve(module: string): DocumentApprovalBaseService | null {
    if (!module) return null;
    const direct = this.registry[module];
    if (direct) return direct;

    const key = Object.keys(this.registry).find(
      (name) => name.toLowerCase() === String(module).toLowerCase(),
    );
    return key ? this.registry[key] : null;
  }

  /** Padanan `receive(Request $request)` - POST /api/maildata. */
  async receive(body: Record<string, any>): Promise<string> {
    const service = this.resolve(body.module);
    if (!service) {
      this.logger.channel('sendmail').error(`Module tidak dikenali: ${body.module}`);
      return `Module tidak dikenali: ${body.module}`;
    }
    return service.send(body);
  }

  /** Padanan `processData($module, $status, $encrypt)`. */
  async processData(module: string, status: string, encrypt: string): Promise<string> {
    this.logger.channel('daily').info('Starting database query execution for processData');

    try {
      const data = await this.token.decrypt(encrypt);

      // Purchase Requisition level 1 memakai template khusus.
      const isPoRequestLevel1 =
        data.type === 'Q' &&
        data.type_module === 'PO' &&
        ['1', 1].includes(data.level_no as any);

      return await this.flow.processData({
        data,
        encrypt,
        status,
        passCheckView: isPoRequestLevel1
          ? 'email/por/passcheckwithremark'
          : 'email/passcheckwithremark',
        afterView: 'email.after',
        withDocumentContext: true,
        extraViewData: { module },
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`Error in processData method: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.after', { Pesan: err?.message ?? String(err) });
    }
  }

  /** Padanan `getAccess(Request $request)` - POST /api/getaccess. */
  async getAccess(body: Record<string, any>): Promise<string> {
    try {
      const service = this.resolve(body.module);
      if (!service) {
        throw new Error(`Module tidak dikenali: ${body.module}`);
      }

      const reason = body.reason ? body.reason : 'no note';
      return await service.updateWith(String(body.status ?? ''), String(body.encrypt ?? ''), reason);
    } catch (err: any) {
      this.logger.channel('daily').error(`Error in getAccess method: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.after', {
        Pesan: err?.message ?? String(err),
        image: 'reject.png',
      });
    }
  }
}
