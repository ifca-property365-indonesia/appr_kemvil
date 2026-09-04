import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { PO_ORDER } from './po-order.definition';

/** Padanan PoOrderController pada project Laravel. */
@Injectable()
export class PoOrderService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = PO_ORDER;
}
