import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CB_PPU } from './cb-ppu.definition';

/** Padanan CbPpuController pada project Laravel. */
@Injectable()
export class CbPpuService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CB_PPU;
}
