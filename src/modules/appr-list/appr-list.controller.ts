import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ViewService } from '../../common/view/view.service';
import { ApprListService } from './appr-list.service';

@ApiTags('Approval List')
@Controller('apprlist')
export class ApprListController {
  constructor(
    private readonly service: ApprListService,
    private readonly view: ViewService,
  ) {}

  /** GET /apprlist - halaman daftar approval yang masih menunggu. */
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Halaman daftar approval pending' })
  @ApiProduces('text/html')
  page() {
    return this.view.render('apprlist.index');
  }

  /** GET /apprlist/data - satu baris per dokumen, hanya level yang sedang ditunggu. */
  @Get('data')
  @ApiOperation({ summary: 'Data approval pending (level O terendah per dokumen)' })
  data() {
    return this.service.pending();
  }

  /** POST /apprlist/sendData - kirim ulang email approval dokumen tersebut. */
  @Post('sendData')
  @ApiOperation({ summary: 'Kirim ulang email approval ke level yang sedang ditunggu' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entity_cd', 'doc_no'],
      properties: { entity_cd: { type: 'string', example: '01' }, doc_no: { type: 'string', example: 'PR26110002' } },
    },
  })
  sendData(@Body() body: Record<string, any>) {
    return this.service.resend(body?.entity_cd, body?.doc_no);
  }
}
