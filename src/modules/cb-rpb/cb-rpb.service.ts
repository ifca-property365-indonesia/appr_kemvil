import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CB_RPB } from './cb-rpb.definition';

/** Padanan CbRpbController pada project Laravel. */
@Injectable()
export class CbRpbService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CB_RPB;
}
