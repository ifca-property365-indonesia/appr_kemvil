import { Module } from '@nestjs/common';
import { FeedbackMailService } from '../../common/services/feedback-mail.service';
import { LandFphController } from './land-fph.controller';
import { LandFphService } from './land-fph.service';

@Module({
  controllers: [LandFphController],
  providers: [LandFphService, FeedbackMailService],
  exports: [LandFphService],
})
export class LandFphModule {}
