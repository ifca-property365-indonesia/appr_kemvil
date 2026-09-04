import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CM_DONE } from './cm-done.definition';

/** Padanan CmDoneController pada project Laravel. */
@Injectable()
export class CmDoneService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CM_DONE;
}
