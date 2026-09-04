import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_REQUEST } from './land-request.definition';

/** Padanan LandRequestController pada project Laravel. */
@Injectable()
export class LandRequestService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_REQUEST;
}
