import { Injectable } from '@nestjs/common';
import {
  DocumentApprovalBaseService,
  DocumentApprovalDefinition,
} from '../../common/base/document-approval.base';
import { CONTRACT_RENEW } from './contract-renew.definition';

/** Padanan ContractRenewController pada project Laravel. */
@Injectable()
export class ContractRenewService extends DocumentApprovalBaseService {
  protected readonly definition: DocumentApprovalDefinition = CONTRACT_RENEW;
}
