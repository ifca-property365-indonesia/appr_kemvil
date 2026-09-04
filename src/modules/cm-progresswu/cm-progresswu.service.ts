import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CM_PROGRESSWU } from './cm-progresswu.definition';

/** Padanan CmProgresswuController pada project Laravel. */
@Injectable()
export class CmProgresswuService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CM_PROGRESSWU;
}
