/*
 * Tabel penyimpan payload token URL approval.
 *
 * Pengganti Crypt::encrypt() milik Laravel yang menghasilkan token base64
 * sepanjang ~350-500 karakter. Dengan tabel ini URL email hanya membawa id acak
 * 10 karakter, contoh:
 *     https://host/api/cmentry/A/f3Kq9ZaP2x
 *
 * Aplikasi membuat tabel ini otomatis saat start bila URL_TOKEN_AUTO_MIGRATE=true.
 * Script ini disediakan untuk environment yang user aplikasinya tidak punya hak
 * CREATE TABLE.
 */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'mgr' AND t.name = 'approval_url_token'
)
BEGIN
    CREATE TABLE mgr.approval_url_token (
        id            VARCHAR(32)   NOT NULL PRIMARY KEY,
        payload_hash  CHAR(64)      NOT NULL,
        payload       NVARCHAR(MAX) NOT NULL,
        created_at    DATETIME      NOT NULL
            CONSTRAINT DF_approval_url_token_created DEFAULT (GETDATE())
    );

    CREATE UNIQUE INDEX UX_approval_url_token_hash
        ON mgr.approval_url_token (payload_hash);
END
GO
