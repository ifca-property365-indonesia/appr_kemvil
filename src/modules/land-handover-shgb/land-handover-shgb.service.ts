import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_HANDOVER_SHGB } from './land-handover-shgb.definition';

/** Padanan LandHandoverShgbController pada project Laravel. */
@Injectable()
export class LandHandoverShgbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_HANDOVER_SHGB;
}
