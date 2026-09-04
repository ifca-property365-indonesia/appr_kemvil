import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MASTER_RENEW } from './land-master-renew.definition';

/** Padanan LandMasterRenewController pada project Laravel. */
@Injectable()
export class LandMasterRenewService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MASTER_RENEW;
}
