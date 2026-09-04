import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { PL_BUDGET_REVISION } from './pl-budget-revision.definition';

/** Padanan PLBudgetRevisionController pada project Laravel. */
@Injectable()
export class PlBudgetRevisionService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = PL_BUDGET_REVISION;
}
