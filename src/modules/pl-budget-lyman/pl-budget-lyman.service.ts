import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { PL_BUDGET_LYMAN } from './pl-budget-lyman.definition';

/** Padanan PLBudgetLymanController pada project Laravel. */
@Injectable()
export class PlBudgetLymanService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = PL_BUDGET_LYMAN;
}
