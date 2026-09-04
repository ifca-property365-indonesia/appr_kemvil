import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CB_FUPD } from './cb-fupd.definition';

/** Padanan CbFupdController pada project Laravel. */
@Injectable()
export class CbFupdService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CB_FUPD;
}
