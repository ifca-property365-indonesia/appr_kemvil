import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { PL_OVERWRITE } from './pl-overwrite.definition';

/** Padanan PlOverwriteController pada project Laravel. */
@Injectable()
export class PlOverwriteService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = PL_OVERWRITE;
}
