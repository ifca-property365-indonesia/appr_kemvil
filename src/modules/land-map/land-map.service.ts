import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_MAP } from './land-map.definition';

/** Padanan LandMapController pada project Laravel. */
@Injectable()
export class LandMapService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_MAP;
}
