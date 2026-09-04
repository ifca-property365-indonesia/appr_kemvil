# Approval BEFA — NestJS

Hasil migrasi penuh dari project Laravel `approval_befa` (PHP 8.1 / Laravel 10)
ke **NestJS 10 + TypeScript**. Seluruh controller, helper, Mailable, view Blade
dan route dipindahkan; satu fitur = satu module NestJS.

---

## 1. Menjalankan

```bash
npm install
npm run build
npm run start:prod        # atau: npm run start:dev
```

Server berjalan di `APP_PORT` (default `3000`).

| Perintah | Fungsi |
| --- | --- |
| `npm run start:dev` | mode watch |
| `npm run build` | compile ke `dist/` |
| `npm run key:generate` | padanan `php artisan key:generate` |
| `npm run migrate` | jalankan SQL di folder `database/` |

---

## 2. Konfigurasi (`.env`)

Semua nilai `.env` project Laravel dibawa apa adanya (database BEFA, SMTP,
log, dsb). Yang **sengaja berbeda** hanya dua, sesuai permintaan:

| Key | Laravel | NestJS |
| --- | --- | --- |
| `APP_KEY` | `base64:y9A0Pv7z…` | kunci baru (32 byte, dipakai untuk token mode `inline`) |
| `APP_URL` | `https://approval.property365.co.id:4421/approval_befa` | `http://localhost:3000` — **wajib diganti** ke URL publik sebelum produksi, karena dipakai membangun link Approve/Revise/Reject di dalam email |

Tambahan yang tidak ada di Laravel:

| Key | Default | Fungsi |
| --- | --- | --- |
| `APP_PORT` | `3000` | port HTTP |
| `APP_TIMEZONE` | `Asia/Jakarta` | zona waktu proses |
| `URL_TOKEN_MODE` | `db` | `db` atau `inline` (lihat bagian 4) |
| `URL_TOKEN_LENGTH` | `10` | panjang id token pada URL |
| `URL_TOKEN_TABLE` | `mgr.approval_url_token` | tabel penyimpan payload token |
| `URL_TOKEN_AUTO_MIGRATE` | `true` | buat tabel token otomatis saat start |
| `URL_TOKEN_TTL_DAYS` | `0` | `0` = token tidak kedaluwarsa |
| `MAIL_USE_DB_SMTP` | `false` | `true` untuk memakai `mgr.smtp_configuration` per entity |
| `MAIL_BCC_FEEDBACK` | `noreply@ifca.co.id` | BCC email feedback (hardcode di versi Laravel) |
| `FTP_*` | uat.ifca.co.id:2111 | dipakai endpoint `POST /api/fileexist` |

---

## 3. Struktur project

```
src/
  main.ts                     bootstrap (static assets, body parser, CORS)
  app.module.ts               registrasi seluruh module
  common/
    config/configuration.ts   padanan config/app.php, database.php, mail.php
    database/                 DatabaseService — padanan DB::connection('BEFA')
    mail/                     MailService, SmtpConfigService, ApprovalMailService
    view/                     ViewService — padanan helper view()
    crypto/token.service.ts   pengganti Crypt::encrypt/decrypt (token pendek)
    cache/                    MailCacheService — anti double-send (file + lock)
    logger/                   AppLoggerService — padanan Log::channel()
    helpers/                  FormatHelper, blade helper, DataTables, dll
    services/                 ApprovalFlowService, FeedbackMailService
    base/                     alur bersama Land & non-Land
  modules/<nama-module>/      1 module = definition + service + controller + module
views/                        97 template hasil konversi Blade -> EJS
public/, assets/              aset statis (logo entity, gambar status, css)
database/                     script SQL
scripts/                      convert-blade.js, migrate.js, key-generate.js
storage/app/mail_cache/       penanda anti double-send (struktur sama dgn Laravel)
storage/logs/                 log harian per channel
```

Setiap module fitur berisi 4 file:

| File | Isi |
| --- | --- |
| `<nama>.definition.ts` | seluruh bagian khas module: TYPE, stored procedure, folder cache, view email, susunan `dataArray` & payload token |
| `<nama>.service.ts` | mewarisi base service |
| `<nama>.controller.ts` | route |
| `<nama>.module.ts` | registrasi Nest |

---

## 4. Token URL pendek (pengganti `Crypt::encrypt`)

Laravel menaruh seluruh payload terenkripsi di URL sehingga link approval
panjangnya ±400–500 karakter. Di sini payload disimpan di tabel dan URL hanya
membawa id acak base62 **10 karakter**:

```
Laravel : /api/cmentry/A/eyJpdiI6IkZ4…(±450 karakter)
NestJS  : /api/cmentry/A/fXUMzgchxh
```

* Payload identik menghasilkan id yang sama (idempotent), jadi kirim ulang email
  tidak menumpuk baris.
* Tabel `mgr.approval_url_token` dibuat otomatis saat start
  (`URL_TOKEN_AUTO_MIGRATE=true`); bila user aplikasi tidak punya hak
  `CREATE TABLE`, jalankan `database/001_create_approval_url_token.sql` manual.
* Bila tabel tidak tersedia, service otomatis jatuh ke mode `inline`
  (AES-256-GCM + deflate + base64url, ±120–180 karakter) sehingga email tetap
  terkirim.
* `URL_TOKEN_MODE=inline` memaksa mode tanpa tabel.
* Saat decrypt, token ≤ 24 karakter alfanumerik dicari di tabel lebih dulu, lalu
  fallback ke mode inline — jadi kedua format dapat hidup berdampingan.

---

## 5. Peta route

Seluruh route Laravel dipertahankan (154 route terdaftar).

### Halaman & utilitas

| Method | Path | Asal |
| --- | --- | --- |
| GET | `/` | `routes/web.php` (welcome) |
| GET | `/appr-list` | `ApprListControllers@index` |
| GET | `/apprlist/data` | `ApprListControllers@getData` (DataTables server-side) |
| POST | `/apprlist/sendData` | `ApprListControllers@sendData` (kirim ulang email) |
| GET | `/check-imap` | `routes/web.php` |
| GET | `/api/connect`, `/api/info` | `ConnectController` |
| GET | `/api/env` | `EnvController` |
| GET | `/api/dbcheck` | `DatabaseConnectionController` |
| GET | `/api/select` | `SelController` |
| GET | `/api/encrypt` | `EncryptController` |

### Dispatcher generic

| Method | Path | Asal |
| --- | --- | --- |
| POST | `/api/maildata` | `MailDataController@receive` |
| GET | `/api/processdata/{module}/{status}/{token}` | `MailDataController@processData` |
| POST | `/api/getaccess` | `MailDataController@getAccess` |

`module` memakai nama seperti pada `$dataArray['module']`: `CbFupd`, `CbRpb`,
`CbRum`, `PoOrder`, `PoRequest`, `CbPpu`, `CbPpuVvip`, `CmEntry`, …

### Module approval

Pola untuk hampir seluruh module:

```
POST /api/<key>                      kirim email approval
GET  /api/<key>/{status}/{token}     halaman konfirmasi (status: A|R|C)
POST /api/<key>/getaccess            eksekusi keputusan
```

| Module | key | Module | key |
| --- | --- | --- | --- |
| CmEntry | `cmentry` | LandBoundary | `landboundary` |
| CmDone | `cmdone` | LandCancelNop | `landcancelnop` |
| CmClose | `cmclose` | LandChangeName | `landchangename` |
| CmProgress | `cmprogress` | LandExtensionShgb | `landextensionshgb` |
| CmProgresswu | `cmprogresswu` | LandFph | `landfph` (+ `/feedback`) |
| VarianOrder | `varianorder` | LandHandoverLegal | `landhandoverlegal` |
| CbPpu | `cbppu` | LandHandoverShgb | `landhandovershgb` |
| CbPpuVvip | `cbppuvvip` | LandMap | `landmap` |
| CbRpb | `cbrpb` | LandMaster | `landmaster` |
| CbRum | `cbrum` | LandMasterRenew | `landmasterrenew` |
| CbFupd | `cbfupb` | LandMeasuring | `landmeasuring` |
| PoOrder | `poorder` | LandMeasuringSft | `landmeasuringsft` |
| PoRequest | `porequest` | LandMergeShgb | `landmergeshgb` |
| PlBudgetLyman | `budgetlyman` | LandRequest | `landrequest` |
| PlBudgetRevision | `budgetrevision` | LandSftBphtb | `landsftbphtb` |
| PlOverwrite | `ploverwrite` | LandSftPropose | `landsftpropose` |
| ContractRenew | `contractrenew` | LandSftShgb | `landsftshgb` |
| | | LandSph | `landsph` |
| | | LandSplitShgb | `landsplitshgb` |
| | | LandVerification | `landverification` (+ `/feedback`) |
| | | LandVerificationPayment | `landverificationpayment` |

Pengecualian bentuk route:

| Module | Route |
| --- | --- |
| PurchaseSelection | `POST /api/purchase_selection`, `GET /api/poselection/{status}/{token}`, `POST /api/poselection/getaccess`, `POST /api/pos/getaccess` |
| LandSubmission | `POST /api/landsubmission`, `GET /api/landsubmission/{status}/{token}`, `POST /api/landsubmission/update` |

### Feedback & batch

| Method | Path | Asal |
| --- | --- | --- |
| POST | `/api/staffaction`, `/api/staffaction_por`, `/api/staffaction_pos` | `StaffActionController` |
| POST | `/api/fileexist` | `StaffActionController@fileexist` (FTP) |
| POST | `/api/feedbackland`, `/api/feedbacklandrequest` | `StaffActionController` |
| POST | `/api/feedback_po`, `/api/feedback_cb`, `/api/feedback_cb_fupd`, `/api/feedback_cm_progress` | `StaffFeedbackController` |
| POST | `/api/feedback_pl_budget_lyman`, `/api/feedback_pl_budget_revision` | `FeedbackPLController` (route baru — di Laravel belum terdaftar) |
| GET | `/api/autosend` | `AutoSendController` |
| GET | `/api/autosendtest` | `AutoSendTestController` (dry-run, hanya menampilkan perintah) |
| GET | `/api/autofeedback` | `AutoFeedbackController` |
| GET | `/api/checkfeedback` | `CheckFeedbackController` |
| GET | `/api/oldfeedback?day=16` | `OldFeedbackController` |

Endpoint batch di atas dulunya dipanggil lewat scheduler/cron; pola pemanggilan
tidak berubah.

---

## 6. Padanan komponen Laravel

| Laravel | NestJS |
| --- | --- |
| `DB::connection('BEFA')` | `DatabaseService` (`mssql`, connection pool) |
| `$pdo->prepare("EXEC …")` | `DatabaseService.execProcedure()` |
| `Crypt::encrypt/decrypt` | `TokenService` |
| `Mail::to()->send(new XxxMail)` | `MailService.send()` (nodemailer) |
| 36 class `App\Mail\*` | satu `MailService` + `view` per pemanggilan |
| `view('email.cmentry.send')` | `ViewService.render('email.cmentry.send')` |
| Blade `.blade.php` | EJS `.ejs` di folder `views/` |
| `Log::channel('sendmail')` | `AppLoggerService.channel('sendmail')` (winston daily) |
| cache file + `flock` | `MailCacheService.guard()` (struktur folder sama) |
| `App\Helpers\FormatHelper` | `common/helpers/format.helper.ts` |
| `getEntityLogo()` | helper `getEntityLogo` di `blade.helper.ts` |
| `App\Services\SmtpConfigService` | `SmtpConfigService` (aktif bila `MAIL_USE_DB_SMTP=true`) |
| `yajra/laravel-datatables` | `common/helpers/datatables.helper.ts` |

Konversi Blade dilakukan oleh `scripts/convert-blade.js` sehingga bisa diulang
bila view lama berubah:

```bash
node scripts/convert-blade.js ../approval_befa/resources/views ./views
```

---

## 7. Perbedaan yang disengaja

1. **`APP_KEY` & `APP_URL` baru** — sesuai permintaan. `APP_URL` wajib diganti
   ke URL publik sebelum produksi.
2. **Token URL 10 karakter** (bagian 4) menggantikan token panjang Laravel.
   Karena format berbeda, link approval lama tidak dapat dibuka di sistem baru —
   sesuai asumsi "project baru, belum ada data".
3. **Route `link` Land diperbaiki.** Pada Laravel `LandfphController` memakai
   `link = 'LandFph'` dan `LandVerificationController` memakai
   `link = 'LandVerification'`, sehingga tombol pada halaman konfirmasi mengarah
   ke `/api/LandFph/getaccess` dan `/api/LandVerification/getaccess` yang tidak
   punya route. Di sini `link` disamakan dengan route (`landfph`,
   `landverification`) dan nama view email ditulis eksplisit.
4. **Route yang sebelumnya menunjuk method tak ada kini berfungsi.**
   `POST /api/cbfupb`, `GET /api/cbfupb/{status}/{encrypt}` dan
   `POST /api/cbfupb/getaccess` di Laravel menunjuk `CbFupdController@index`
   / `@processData` / `@getaccess` yang tidak pernah didefinisikan.
5. **Route baru** untuk controller yang belum terdaftar di `routes/api.php`:
   `cbppuvvip`, `cbrpb`, `cbrum`, `poorder`, `porequest`, `budgetlyman`,
   `landmasterrenew`, `feedback_pl_budget_*`. Alur lama lewat `/api/maildata`
   dan `/api/processdata/{module}/…` tetap jalan.
6. **`MailDataController` tidak lagi instansiasi kelas dinamis.** Pemetaan
   `module -> service` dibuat eksplisit di `MailDataService`.
7. **`ConnectController@info` (`phpinfo()`)** diganti `GET /api/info` yang
   menampilkan info runtime Node dan konfigurasi non-rahasia.
8. **`AutoSendTestController`** di Laravel hanya `var_dump()` tanpa `execute()`;
   perilaku dry-run itu dipertahankan (endpoint mengembalikan daftar perintah).
9. **`welcome.blade.php`** (template bawaan Laravel) diganti halaman ringkas
   berisi tautan ke Approval List dan endpoint utama.
10. **`SelController`** di Laravel memuat bug (`$data` tidak terdefinisi) dan
    nomor dokumen hardcode; di sini parameternya dapat dikirim lewat query
    string.
11. **SMTP per entity** tersedia tapi mati secara default, karena
    `SmtpConfigService` di Laravel di-import tetapi tidak pernah dipanggil —
    seluruh email memakai kredensial `.env`.

---

## 8. Status verifikasi

Diuji terhadap database BEFA yang tercantum di `.env`:

* `npx tsc --noEmit` — bersih; `npm run build` — sukses.
* Aplikasi boot, **154 route** terdaftar.
* **97/97** template EJS lolos compile; **96/97** ter-render dengan data contoh
  (`email/landsubmission/sendtset.ejs` — view uji yang tidak dipakai controller
  mana pun — butuh field `approved_date` yang tidak ada di data contoh).
* Alur end-to-end (read-only, tanpa `EXEC` dan tanpa kirim email) untuk
  `varianorder` (CM), `landverification` (LM, memakai `approve_seq`) dan
  `processdata/CbPpu` (dispatcher generic): token 10 karakter dibuat, URL
  dibuka, halaman konfirmasi ter-render benar.
* `GET /appr-list` dan `GET /apprlist/data` berjalan (133 dokumen pending
  terbaca, paging server-side aktif).
* `GET /api/connect` dan `/api/env` melaporkan koneksi database berhasil.
* Tabel `mgr.approval_url_token` sudah terbentuk otomatis di database BEFA;
  seluruh baris uji dihapus kembali (tabel kosong).

**Belum diuji** karena bersifat destruktif / mengirim email ke user asli:
eksekusi stored procedure approval (`POST …/getaccess`), pengiriman email SMTP,
endpoint batch (`autosend`, `autofeedback`, `oldfeedback`) dan
`POST /api/fileexist` (FTP). Jalankan di lingkungan staging lebih dulu.
