import { Module } from '@nestjs/common';
import { FeedbackMailService } from '../../common/services/feedback-mail.service';
import { LandVerificationController } from './land-verification.controller';
import { LandVerificationService } from './land-verification.service';

@Module({
  controllers: [LandVerificationController],
  providers: [LandVerificationService, FeedbackMailService],
  exports: [LandVerificationService],
})
export class LandVerificationModule {}
