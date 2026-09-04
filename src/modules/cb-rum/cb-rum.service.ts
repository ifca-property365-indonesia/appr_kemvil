import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CB_RUM } from './cb-rum.definition';

/** Padanan CbRumController pada project Laravel. */
@Injectable()
export class CbRumService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CB_RUM;
}
