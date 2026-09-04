import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_BOUNDARY } from './land-boundary.definition';

/** Padanan LandBoundaryController pada project Laravel. */
@Injectable()
export class LandBoundaryService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_BOUNDARY;
}
