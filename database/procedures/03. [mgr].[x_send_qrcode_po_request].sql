/*
 * mgr.x_send_qrcode_po_request
 *
 * Minta aplikasi membuat QR code bukti approve satu level, lalu disimpan di FTP:
 *   qrcode/{entity_cd}_{doc_no}_{level_no}.png   (folder dibuat bila belum ada)
 * Dipanggil mgr.x_send_mail_approval_po_request setelah approve (status A) ter-commit.
 * POST JSON ke {api_mail}/api/qrcode. Gagal tidak membatalkan approval (hanya pesan info).
 *
 * Jalankan manual di database tujuan (tidak ikut `npm run migrate`).
 */
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [mgr].[x_send_qrcode_po_request]
	@rt_entity_cd		varchar(4),
	@rt_project_no		varchar(20),
	@rt_doc_no			varchar(30),
	@rt_trx_type		varchar(4),
	@rt_module			varchar(4),
	@rt_level_no		varchar(12),
	@rt_user_id			varchar(10) = NULL,	-- approver yang approve; NULL = semua approver A di level tsb
	@debug				bit = 0				-- 1 = print body, TIDAK kirim HTTP
AS
SET NOCOUNT ON

DECLARE @f_api_mail			varchar(max)
DECLARE @msg				nvarchar(2047)

-- HTTP / OLE
DECLARE @URL				nvarchar(max)
DECLARE @Body				nvarchar(max)
DECLARE @Object				int
DECLARE @hr					int
DECLARE @http_status		int
DECLARE @ResponseText		varchar(8000)
DECLARE @ole_src			varchar(255)
DECLARE @ole_desc			varchar(2000)

-- URL aplikasi approval (tanpa slash di akhir) - samakan dengan SP x_send_mail_approval_po_request
--SELECT @f_api_mail = api_mail FROM mgr.ar_spec (NOLOCK)
--SET @f_api_mail = 'http://10.10.0.25:7354'
SET @f_api_mail = 'https://ifcademo.property365.co.id:7354'
SET @URL = ISNULL(@f_api_mail, '') + '/api/qrcode'

SET @Body = (
	SELECT
		ISNULL(@rt_entity_cd, '')				AS entity_cd,
		ISNULL(@rt_project_no, '')				AS project_no,
		ISNULL(@rt_doc_no, '')					AS doc_no,
		ISNULL(@rt_trx_type, '')				AS trx_type,
		ISNULL(@rt_module, '')					AS appr_module,
		ISNULL(@rt_level_no, '')				AS level_no,
		NULLIF(LTRIM(RTRIM(@rt_user_id)), '')	AS user_id
	FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
)

IF @debug = 1
BEGIN
	SET @msg = CONCAT('---- QR CODE BODY URL=', @URL, ' ---- ', @Body)
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
	RETURN
END

EXEC @hr = sp_OACreate 'MSXML2.ServerXMLHTTP.6.0', @Object OUT
IF @hr = 0
BEGIN
	EXEC sp_OAMethod @Object, 'setTimeouts', NULL, 10000, 10000, 30000, 60000
	EXEC @hr = sp_OAMethod @Object, 'open', NULL, 'POST', @URL, 'false'
	IF @hr = 0
		EXEC @hr = sp_OAMethod @Object, 'setRequestHeader', NULL, 'Content-Type', 'application/json'
	IF @hr = 0
		EXEC @hr = sp_OAMethod @Object, 'send', NULL, @Body
	IF @hr = 0
	BEGIN
		EXEC sp_OAGetProperty @Object, 'status', @http_status OUT
		EXEC sp_OAGetProperty @Object, 'responseText', @ResponseText OUT
	END
	ELSE
		EXEC sp_OAGetErrorInfo @Object, @ole_src OUT, @ole_desc OUT

	EXEC sp_OADestroy @Object
END
ELSE
	EXEC sp_OAGetErrorInfo NULL, @ole_src OUT, @ole_desc OUT

-- Bukan error fatal: approval sudah ter-commit; cukup pesan info supaya terlihat di SSMS / log.
IF @hr <> 0 OR ISNULL(@ResponseText, '') NOT LIKE 'QR code berhasil disimpan: %'
BEGIN
	SET @msg = CONCAT('QR code ', @rt_doc_no, ' level ', @rt_level_no, ' gagal: ',
					  COALESCE(@ole_desc, @ResponseText, 'tidak ada balasan'), ' (HTTP ', @http_status, ')')
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
END

RETURN
GO
