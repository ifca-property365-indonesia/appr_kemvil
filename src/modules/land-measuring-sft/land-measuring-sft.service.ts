import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MEASURING_SFT } from './land-measuring-sft.definition';

/** Padanan LandMeasuringSftController pada project Laravel. */
@Injectable()
export class LandMeasuringSftService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MEASURING_SFT;
}
