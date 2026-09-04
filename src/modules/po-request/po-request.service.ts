import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { PO_REQUEST } from './po-request.definition';

/** Padanan PoRequestController pada project Laravel. */
@Injectable()
export class PoRequestService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = PO_REQUEST;
}
