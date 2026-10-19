import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { PoRequestService } from './po-request.service';

@ApiTags('Purchase Requisition')
@Controller('api')
export class PoRequestController {
  constructor(private readonly service: PoRequestService) {}

  /** POST /api/maildata - dipanggil SP x_send_mail_approval_po_request. */
  @Post('maildata')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Kirim email approval / feedback (dipanggil SP)',
    description:
      'module = PoRequest -> email ke approver; module = PoRequestFeedback -> email feedback ke pembuat PR. ' +
      'Balasan teks "Email berhasil dikirim ke: ..." dibaca SP sebagai sukses.',
  })
  @ApiProduces('text/plain')
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        module: 'PoRequest',
        appr_module: 'PR',
        appr_type: 'C',
        entity_cd: '01',
        project_no: '01',
        doc_no: 'PR26100033',
        trx_type: 'PR',
        level_no: '1',
        user_id: 'INU',
        email_addr: 'approver@example.com',
        user_name: 'Approver',
        entity_name: 'PT CONTOH',
        descs: 'Keterangan PR',
        url_file: 'EMPTY',
        file_name: 'EMPTY',
        approve_exist: 'EMPTY',
        clarify_user: 'Pembuat PR',
        clarify_email: 'maker@example.com',
        sender: 'Pembuat PR',
        sender_addr: 'maker@example.com',
        reason: '',
      },
    },
  })
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/porequest/{A|M|R}/{token} - halaman konfirmasi dari link email. */
  @Get('porequest/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Halaman konfirmasi dari link email' })
  @ApiParam({ name: 'status', enum: ['A', 'M', 'R'], description: 'A = Approve, M = Revise, R = Reject' })
  @ApiParam({ name: 'encrypt', description: 'Token dari link email' })
  @ApiProduces('text/html')
  confirm(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.confirm(status, encrypt);
  }

  /** POST /api/porequest/getaccess - eksekusi keputusan approval. */
  @Post('porequest/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Eksekusi keputusan approval (submit form konfirmasi)' })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status', 'encrypt'],
      properties: {
        status: { type: 'string', enum: ['A', 'M', 'R'] },
        encrypt: { type: 'string', description: 'Token dari link email' },
        reason: { type: 'string', description: "Kosong / 0 -> 'no note'" },
      },
    },
  })
  @ApiProduces('text/html')
  execute(@Body() body: Record<string, any>) {
    return this.service.execute(body);
  }
}
