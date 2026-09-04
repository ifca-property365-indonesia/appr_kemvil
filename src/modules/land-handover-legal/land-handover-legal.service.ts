import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_HANDOVER_LEGAL } from './land-handover-legal.definition';

/** Padanan LandHandoverLegalController pada project Laravel. */
@Injectable()
export class LandHandoverLegalService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_HANDOVER_LEGAL;
}
