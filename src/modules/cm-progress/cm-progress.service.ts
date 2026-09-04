import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CM_PROGRESS } from './cm-progress.definition';

/** Padanan CmProgressController pada project Laravel. */
@Injectable()
export class CmProgressService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CM_PROGRESS;
}
