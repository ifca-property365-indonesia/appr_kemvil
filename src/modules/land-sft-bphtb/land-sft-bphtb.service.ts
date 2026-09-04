import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_SFT_BPHTB } from './land-sft-bphtb.definition';

/** Padanan LandSftBphtbController pada project Laravel. */
@Injectable()
export class LandSftBphtbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_SFT_BPHTB;
}
