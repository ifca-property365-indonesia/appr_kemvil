import { Module } from '@nestjs/common';
import { FeedbackMailService } from '../../common/services/feedback-mail.service';
import { StaffActionController } from './staff-action.controller';
import { StaffActionService } from './staff-action.service';

@Module({
  controllers: [StaffActionController],
  providers: [StaffActionService, FeedbackMailService],
  exports: [StaffActionService],
})
export class StaffActionModule {}
