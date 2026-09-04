import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MEASURING } from './land-measuring.definition';

/** Padanan LandMeasuringController pada project Laravel. */
@Injectable()
export class LandMeasuringService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MEASURING;
}
