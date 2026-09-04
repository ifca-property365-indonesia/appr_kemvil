import { Module } from '@nestjs/common';
import { AutoFeedbackController } from './auto-feedback.controller';
import { AutoFeedbackService } from './auto-feedback.service';

@Module({
  controllers: [AutoFeedbackController],
  providers: [AutoFeedbackService],
  exports: [AutoFeedbackService],
})
export class AutoFeedbackModule {}
