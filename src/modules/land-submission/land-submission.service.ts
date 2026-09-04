import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { LAND_SUBMISSION } from './land-submission.definition';

/** Padanan LandSubmissionController pada project Laravel. */
@Injectable()
export class LandSubmissionService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = LAND_SUBMISSION;
}
