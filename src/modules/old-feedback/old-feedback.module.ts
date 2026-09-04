import { Module } from '@nestjs/common';
import { OldFeedbackController } from './old-feedback.controller';
import { OldFeedbackService } from './old-feedback.service';

@Module({
  controllers: [OldFeedbackController],
  providers: [OldFeedbackService],
  exports: [OldFeedbackService],
})
export class OldFeedbackModule {}
