import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CM_ENTRY } from './cm-entry.definition';

/** Padanan CmEntryController pada project Laravel. */
@Injectable()
export class CmEntryService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CM_ENTRY;
}
