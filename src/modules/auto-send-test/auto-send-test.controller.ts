import { Controller, Get } from '@nestjs/common';
import { AutoSendTestService } from './auto-send-test.service';

/** Migrasi dari app/Http/Controllers/AutoSendTestController.php (GET /api/autosendtest). */
@Controller('api')
export class AutoSendTestController {
  constructor(private readonly service: AutoSendTestService) {}

  @Get('autosendtest')
  index() {
    return this.service.index();
  }
}
