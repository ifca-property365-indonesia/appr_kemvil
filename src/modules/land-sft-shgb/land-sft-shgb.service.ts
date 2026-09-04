import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_SFT_SHGB } from './land-sft-shgb.definition';

/** Padanan LandSftShgbController pada project Laravel. */
@Injectable()
export class LandSftShgbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_SFT_SHGB;
}
