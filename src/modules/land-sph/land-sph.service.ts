import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_SPH } from './land-sph.definition';

/** Padanan LandSphController pada project Laravel. */
@Injectable()
export class LandSphService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_SPH;
}
