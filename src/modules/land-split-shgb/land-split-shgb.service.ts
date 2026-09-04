import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_SPLIT_SHGB } from './land-split-shgb.definition';

/** Padanan LandSplitShgbController pada project Laravel. */
@Injectable()
export class LandSplitShgbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_SPLIT_SHGB;
}
