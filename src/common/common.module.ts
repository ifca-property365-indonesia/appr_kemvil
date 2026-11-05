import { Global, Module } from '@nestjs/common';
import { AttachmentService } from './attachment/attachment.service';
import { MailCacheService } from './cache/mail-cache.service';
import { TokenService } from './crypto/token.service';
import { DatabaseService } from './database/database.service';
import { AppLoggerService } from './logger/app-logger.service';
import { ApprovalMailService } from './mail/approval-mail.service';
import { MailService } from './mail/mail.service';
import { SmtpConfigService } from './mail/smtp-config.service';
import { ViewService } from './view/view.service';

/**
 * Infrastruktur bersama seluruh module approval (DB, mail, view, token, cache, log).
 * Dibuat @Global supaya setiap module fitur tidak perlu meng-import ulang.
 */
@Global()
@Module({
  providers: [
    AttachmentService,
    AppLoggerService,
    DatabaseService,
    ViewService,
    SmtpConfigService,
    MailService,
    MailCacheService,
    ApprovalMailService,
    TokenService,
  ],
  exports: [
    AttachmentService,
    AppLoggerService,
    DatabaseService,
    ViewService,
    SmtpConfigService,
    MailService,
    MailCacheService,
    ApprovalMailService,
    TokenService,
  ],
})
export class CommonModule {}
