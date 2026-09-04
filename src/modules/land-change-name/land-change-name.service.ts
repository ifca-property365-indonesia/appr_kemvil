import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_CHANGE_NAME } from './land-change-name.definition';

/** Padanan LandChangeNameController pada project Laravel. */
@Injectable()
export class LandChangeNameService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_CHANGE_NAME;
}
