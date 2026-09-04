import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CM_CLOSE } from './cm-close.definition';

/** Padanan CmCloseController pada project Laravel. */
@Injectable()
export class CmCloseService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CM_CLOSE;
}
