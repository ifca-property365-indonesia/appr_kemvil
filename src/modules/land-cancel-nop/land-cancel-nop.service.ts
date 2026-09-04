import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_CANCEL_NOP } from './land-cancel-nop.definition';

/** Padanan LandCancelNopController pada project Laravel. */
@Injectable()
export class LandCancelNopService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_CANCEL_NOP;
}
