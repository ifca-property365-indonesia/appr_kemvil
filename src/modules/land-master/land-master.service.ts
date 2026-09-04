import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MASTER } from './land-master.definition';

/** Padanan LandMasterController pada project Laravel. */
@Injectable()
export class LandMasterService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MASTER;
}
