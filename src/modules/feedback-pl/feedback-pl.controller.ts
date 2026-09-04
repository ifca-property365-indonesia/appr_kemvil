import { Body, Controller, Post } from '@nestjs/common';
import { FeedbackPlService } from './feedback-pl.service';

/**
 * Migrasi dari app/Http/Controllers/FeedbackPLController.php.
 * Controller ini tidak punya route pada routes/api.php Laravel; route berikut
 * ditambahkan agar method-nya dapat dipakai.
 */
@Controller('api')
export class FeedbackPlController {
  constructor(private readonly service: FeedbackPlService) {}

  @Post('feedback_pl_budget_lyman')
  feedbackBudgetLyman(@Body() body: Record<string, any>) {
    return this.service.feedbackBudgetLyman(body);
  }

  @Post('feedback_pl_budget_revision')
  feedbackBudgetRevision(@Body() body: Record<string, any>) {
    return this.service.feedbackBudgetRevision(body);
  }
}
