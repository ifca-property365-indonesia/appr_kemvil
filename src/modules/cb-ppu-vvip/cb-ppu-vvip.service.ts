import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CB_PPU_VVIP } from './cb-ppu-vvip.definition';

/** Padanan CbPPuVvipController pada project Laravel. */
@Injectable()
export class CbPpuVvipService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CB_PPU_VVIP;
}
