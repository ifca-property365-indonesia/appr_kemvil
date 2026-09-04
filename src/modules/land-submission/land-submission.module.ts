import { Module } from '@nestjs/common';
import { LandSubmissionController } from './land-submission.controller';
import { LandSubmissionService } from './land-submission.service';

@Module({
  controllers: [LandSubmissionController],
  providers: [LandSubmissionService],
  exports: [LandSubmissionService],
})
export class LandSubmissionModule {}
