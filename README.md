# Approval Kemang Village — NestJS

Gateway email approval **Purchase Requisition (PR)** untuk Kemang Village.
Aplikasi ini hanya punya satu alur: menerima data dari stored procedure
`mgr.x_send_mail_approval_po_request`, mengirim email ke approver, lalu
menjalankan keputusan approver (Approve / Revise / Reject) kembali ke SP.

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
| `npm run key:generate` | buat `APP_KEY` baru |
| `npm run migrate` | jalankan file `.sql` di **root** folder `database/` (tidak termasuk `database/procedures/`) |

---

## 2. Alur approval

```
ERP submit PR / approver klik link
        │
        ▼
EXEC mgr.x_send_mail_approval_po_request
        │  1. update status approver (O -> A/M/R)
        │  2. approve: buka level berikutnya (N -> O), atau final approve PR
        │  3. POST JSON ke {APP_URL}/api/maildata untuk setiap approver berstatus O
        ▼
POST /api/maildata ──► email ke approver (link Approve / Revise / Reject)
        │
        ▼
GET  /api/porequest/{A|M|R}/{token} ──► halaman konfirmasi + kolom alasan
        │
        ▼
POST /api/porequest/getaccess ──► EXEC SP lagi (kembali ke atas)
```

Status pada `mgr.po_authorized_person.status`:

| Status | Arti |
| --- | --- |
| `N` | belum giliran |
| `O` | giliran approve (link email hanya berlaku pada status ini) |
| `A` | approved |
| `M` | revise |
| `R` | reject |

Revise dan Reject menghentikan alur; tidak ada email ke level berikutnya.
Bila satu level punya beberapa approver, level berikutnya baru dibuka setelah
semua approver di level itu approve.

**Feedback ke pembuat PR.** Saat PR selesai (approve di level terakhir, Revise,
atau Reject), SP approval memanggil `mgr.x_send_mail_feedback_po_request`. SP ini
mengirim email ke `po_authorized_person.prepared_by` berisi status, alasan, dan
daftar approver; "Thank you" berasal dari approver terakhir yang memproses.
Gagal kirim feedback tidak membatalkan approval.

---

## 3. Stored procedure

Script ada di [`database/procedures/x_send_mail_approval_po_request.sql`](database/procedures/x_send_mail_approval_po_request.sql)
dan [`database/procedures/x_send_mail_feedback_po_request.sql`](database/procedures/x_send_mail_feedback_po_request.sql),
dijalankan **manual** di database tujuan (feedback lebih dulu). URL `@f_api_mail`
di kedua SP harus sama.

| Parameter | Keterangan |
| --- | --- |
| `@rt_entity_cd`, `@rt_project_no`, `@rt_doc_no` | identitas dokumen PR |
| `@rt_trx_type`, `@rt_module` | contoh `PR`, `PR` |
| `@rt_status` | `A` / `M` / `R` |
| `@rt_level_no` | `0` = submit baru (hanya kirim email ke level `O` terendah) |
| `@rt_reason` | catatan approver |
| `@rt_user_id` | approver yang memproses. `NULL` = semua approver di level tsb |
| `@debug` | `1` = print setiap langkah dan body JSON tanpa mengirim HTTP |

URL aplikasi diisi pada SP (bagian 3, `@f_api_mail`), saat ini
`http://10.10.0.25:7353`. SQL Server dan aplikasi berada di jaringan yang sama,
jadi pakai **HTTP** langsung ke Node: `https://<IP>` selalu gagal dengan error
"The host name in the certificate is invalid". SP butuh
`Ole Automation Procedures` aktif di SQL Server.

Contoh uji tanpa mengubah data:

```sql
BEGIN TRAN
EXEC mgr.x_send_mail_approval_po_request
    '01', '<project_no>', 'PR26100033', 'PR', 'PR', 'A', '1', 'ok', 'INU', @debug = 1
ROLLBACK
```

---

## 4. Endpoint

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/api/maildata` | terima body JSON dari SP, kirim email. Balasan teks `Email berhasil dikirim ke: …` / `Email has already been sent to: …` dibaca SP sebagai sukses |
| GET | `/api/porequest/{A\|M\|R}/{token}` | halaman konfirmasi dari link email |
| POST | `/api/porequest/getaccess` | jalankan SP dengan keputusan approver |
| GET | `/` | `SWAGGER_HOST=1`: redirect ke Swagger UI; `0`: halaman ringkas |
| GET | `/docs`, `/docs-json` | Swagger UI & spesifikasi OpenAPI (hanya bila `SWAGGER_HOST=1`) |
| GET | `/api/connect`, `/api/dbcheck` | cek koneksi database |
| GET | `/api/info`, `/api/env` | info runtime & konfigurasi non-rahasia |

Field body `/api/maildata` (dibentuk SP lewat `FOR JSON`): `module` (`PoRequest`),
`appr_module`, `appr_type`, `entity_cd`, `project_no`, `doc_no`, `trx_type`,
`level_no`, `user_id`, `email_addr`, `user_name`, `entity_name`, `descs`,
`url_file`, `file_name`, `approve_exist`, `clarify_user`, `clarify_email`,
`sender`, `sender_addr`, `reason`. Daftar dipisah `; `, nilai kosong = `EMPTY`.

---

## 5. Konfigurasi (`.env`)

Lihat `.env.example`. Yang penting:

| Key | Fungsi |
| --- | --- |
| `APP_URL` | URL publik aplikasi; dipakai membangun link di email. **Wajib** diisi sebelum produksi |
| `APP_KEY` | kunci token mode `inline` (`npm run key:generate`) |
| `SWAGGER_HOST` | `1` = aktifkan Swagger UI di `/docs` (root `/` diarahkan ke sana); `0` = mati (default) |
| `DB_HOST2`, `DB_PORT2`, `DB_DATABASE2`, `DB_USERNAME2`, `DB_PASSWORD2` | koneksi SQL Server |
| `MAIL_*` | SMTP pengirim email |
| `MAIL_USE_DB_SMTP` | `true` untuk memakai SMTP per entity dari `mgr.smtp_configuration` |
| `URL_TOKEN_MODE` | `db` (default, id 10 karakter di URL) atau `inline` |
| `URL_TOKEN_TABLE` | tabel token, default `mgr.approval_url_token` (dibuat otomatis, atau jalankan `database/001_create_approval_url_token.sql`) |
| `LOG_HTTP`, `LOG_RETENTION_DAYS` | jejak akses HTTP dan umur simpan log |

---

## 6. Struktur project

```
src/
  main.ts                       bootstrap (static assets, body parser, CORS)
  app.module.ts                 CommonModule + PoRequestModule + SystemModule
  common/                       DB, mail, view (EJS), token URL, cache anti double-send, logger
  modules/po-request/           alur approval PR (controller + service)
  modules/system/               halaman root & endpoint utilitas
views/
  email/porequest/send.ejs      isi email ke approver
  email/porequest/confirm.ejs   halaman konfirmasi + kolom alasan
  email/after.ejs               halaman hasil
  welcome.ejs
database/
  001_create_approval_url_token.sql
  procedures/                   stored procedure (dijalankan manual)
public/, assets/                aset statis
```

---

## 7. Log & anti double-send

* `storage/logs/<channel>-YYYY-MM-DD/<module>.log`, channel penting:
  `sendmailapproval` (email terkirim), `sendmail` (gagal kirim),
  `approval` (jejak keputusan: akses, mulai, sukses/gagal), `daily` (umum & SP).
* Email yang sama (entity, doc_no, level, user_id) hanya dikirim sekali per hari;
  penanda disimpan di `storage/app/mail_cache/send_porequest/YYYYMMDD/`.
