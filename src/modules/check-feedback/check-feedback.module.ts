import { Module } from '@nestjs/common';
import { CheckFeedbackController } from './check-feedback.controller';
import { CheckFeedbackService } from './check-feedback.service';

@Module({
  controllers: [CheckFeedbackController],
  providers: [CheckFeedbackService],
  exports: [CheckFeedbackService],
})
export class CheckFeedbackModule {}
