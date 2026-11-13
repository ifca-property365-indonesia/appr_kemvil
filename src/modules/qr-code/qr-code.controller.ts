import { Body, Controller, Header, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { QrCodeService } from './qr-code.service';

@ApiTags('QR Code')
@Controller('api')
export class QrCodeController {
  constructor(private readonly service: QrCodeService) {}

  /** POST /api/qrcode - dipanggil SP x_send_qrcode_po_request setiap ada approve. */
  @Post('qrcode')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Buat QR code bukti approve dan simpan di FTP (dipanggil SP)',
    description:
      'File: qrcode/{entity_cd}_{doc_no}_{level_no}.png. Balasan "QR code berhasil disimpan: ..." dibaca SP sebagai sukses.',
  })
  @ApiProduces('text/plain')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entity_cd', 'doc_no', 'level_no', 'trx_type'],
      example: {
        entity_cd: '01',
        project_no: '01',
        doc_no: 'PR26110002',
        trx_type: 'PR',
        appr_module: 'PR',
        level_no: '1',
        user_id: 'INU',
      },
    },
  })
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }
}
