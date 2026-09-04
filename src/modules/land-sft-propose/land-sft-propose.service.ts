import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_SFT_PROPOSE } from './land-sft-propose.definition';

/** Padanan LandSftProposeController pada project Laravel. */
@Injectable()
export class LandSftProposeService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_SFT_PROPOSE;
}
