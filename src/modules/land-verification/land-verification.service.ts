import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LandApprovalBaseService,
  LandApprovalDefinition,
} from '../../common/base/land-approval.base';
import { TokenService } from '../../common/crypto/token.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalMailService } from '../../common/mail/approval-mail.service';
import { ApprovalFlowService } from '../../common/services/approval-flow.service';
import {
  FeedbackCallback,
  FeedbackMailService,
} from '../../common/services/feedback-mail.service';
import { LAND_VERIFICATION } from './land-verification.definition';

/** Padanan LandVerificationController pada project Laravel. */
@Injectable()
export class LandVerificationService extends LandApprovalBaseService {
  protected readonly definition: LandApprovalDefinition = LAND_VERIFICATION;

  constructor(
    token: TokenService,
    approvalMail: ApprovalMailService,
    flow: ApprovalFlowService,
    logger: AppLoggerService,
    config: ConfigService,
    private readonly feedback: FeedbackMailService,
  ) {
    super(token, approvalMail, flow, logger, config);
  }

  /** Padanan `feedback_verification(Request $request)`. */
  async feedbackVerification(body: Record<string, any>): Promise<FeedbackCallback> {
    return this.feedback.send({
      body,
      cacheDir: 'feedback/feedback_Land_Verification',
      folderlink: 'landverificationMail',
    });
  }
}
