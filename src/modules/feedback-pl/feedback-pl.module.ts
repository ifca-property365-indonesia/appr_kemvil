import { Module } from '@nestjs/common';
import { FeedbackPlController } from './feedback-pl.controller';
import { FeedbackPlService } from './feedback-pl.service';

@Module({
  controllers: [FeedbackPlController],
  providers: [FeedbackPlService],
  exports: [FeedbackPlService],
})
export class FeedbackPlModule {}
