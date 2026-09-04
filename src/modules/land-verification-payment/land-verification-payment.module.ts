import { Module } from '@nestjs/common';
import { LandVerificationPaymentController } from './land-verification-payment.controller';
import { LandVerificationPaymentService } from './land-verification-payment.service';

@Module({
  controllers: [LandVerificationPaymentController],
  providers: [LandVerificationPaymentService],
  exports: [LandVerificationPaymentService],
})
export class LandVerificationPaymentModule {}
