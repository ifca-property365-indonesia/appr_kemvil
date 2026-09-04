import { Injectable } from '@nestjs/common';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { LAND_VERIFICATION_PAYMENT } from './land-verification-payment.definition';

/** Padanan LandVerificationPaymentController pada project Laravel. */
@Injectable()
export class LandVerificationPaymentService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_VERIFICATION_PAYMENT;
}
