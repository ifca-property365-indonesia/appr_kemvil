import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_EXTENSION_SHGB } from './land-extension-shgb.definition';

/** Padanan LandExtensionShgbController pada project Laravel. */
@Injectable()
export class LandExtensionShgbService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_EXTENSION_SHGB;
}
