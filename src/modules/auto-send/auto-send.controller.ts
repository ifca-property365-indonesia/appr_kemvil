import { Controller, Get } from '@nestjs/common';
import { AutoSendService } from './auto-send.service';

/** Migrasi dari app/Http/Controllers/AutoSendController.php (GET /api/autosend). */
@Controller('api')
export class AutoSendController {
  constructor(private readonly service: AutoSendService) {}

  @Get('autosend')
  index() {
    return this.service.index();
  }
}
