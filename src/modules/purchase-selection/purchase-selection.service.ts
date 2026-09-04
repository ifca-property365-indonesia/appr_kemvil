import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { PURCHASE_SELECTION } from './purchase-selection.definition';

/** Padanan PurchaseSelectionController pada project Laravel. */
@Injectable()
export class PurchaseSelectionService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = PURCHASE_SELECTION;
}
