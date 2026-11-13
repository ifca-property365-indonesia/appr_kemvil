/*
 * Tabel lokasi QR code bukti approve yang tersimpan di FTP.
 *
 * Diisi aplikasi (POST /api/qrcode) setelah file berhasil di-upload:
 *     file_path = qrcode/{entity_cd}_{doc_no}_{level_no}.png   (relatif terhadap root user FTP)
 *     file_url  = URL_PDF/{LIVE|TRAIN}/qrcode/{nama file}
 * Satu baris per dokumen per level; approve ulang di level yang sama memperbarui barisnya.
 *
 * Aplikasi membuat tabel ini otomatis saat start. Script ini disediakan untuk
 * environment yang user aplikasinya tidak punya hak CREATE TABLE (npm run migrate).
 */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'mgr' AND t.name = 'approval_qrcode'
)
BEGIN
    CREATE TABLE mgr.approval_qrcode (
        entity_cd     VARCHAR(4)    NOT NULL,
        project_no    VARCHAR(20)   NOT NULL,
        trx_type      VARCHAR(4)    NOT NULL,
        module        VARCHAR(4)    NOT NULL,
        doc_no        VARCHAR(30)   NOT NULL,
        level_no      INT           NOT NULL,
        file_path     VARCHAR(255)  NOT NULL,
        file_url      VARCHAR(500)  NULL,
        created_at    DATETIME      NOT NULL
            CONSTRAINT DF_approval_qrcode_created DEFAULT (GETDATE()),
        updated_at    DATETIME      NOT NULL
            CONSTRAINT DF_approval_qrcode_updated DEFAULT (GETDATE()),
        CONSTRAINT PK_approval_qrcode
            PRIMARY KEY (entity_cd, project_no, trx_type, module, doc_no, level_no)
    );
END
GO
