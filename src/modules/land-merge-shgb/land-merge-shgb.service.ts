import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MERGE_SHGB } from './land-merge-shgb.definition';

/** Padanan LandMergeShgbController pada project Laravel. */
@Injectable()
export class LandMergeShgbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MERGE_SHGB;
}
