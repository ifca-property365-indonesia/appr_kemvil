import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { VARIAN_ORDER } from './varian-order.definition';

/** Padanan VarianOrderController pada project Laravel. */
@Injectable()
export class VarianOrderService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = VARIAN_ORDER;
}
