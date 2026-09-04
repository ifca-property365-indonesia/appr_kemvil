import { Module } from '@nestjs/common';
import { StaffFeedbackController } from './staff-feedback.controller';
import { StaffFeedbackService } from './staff-feedback.service';

@Module({
  controllers: [StaffFeedbackController],
  providers: [StaffFeedbackService],
  exports: [StaffFeedbackService],
})
export class StaffFeedbackModule {}
