/*
 * mgr.x_send_mail_feedback_po_request
 *
 * Email feedback ke pembuat PR (po_authorized_person.prepared_by) saat proses approval selesai:
 *   A = sudah di-approve semua level, M = diminta revisi, R = ditolak.
 * "Thank you" berasal dari approver terakhir yang memproses (level & user_id yang dikirim).
 *
 * Dipanggil oleh mgr.x_send_mail_approval_po_request setelah COMMIT.
 * POST JSON ke {api_mail}/api/maildata dengan module = 'PoRequestFeedback'.
 *
 * Jalankan manual di database tujuan (tidak ikut `npm run migrate`).
 */
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [mgr].[x_send_mail_feedback_po_request]
	@rt_entity_cd		varchar(4),
	@rt_project_no		varchar(20),
	@rt_doc_no			varchar(30),
	@rt_trx_type		varchar(4),
	@rt_module			varchar(4),
	@rt_status			varchar(1),			-- A / M / R
	@rt_level_no		varchar(12),		-- level approver terakhir yang memproses
	@rt_reason			varchar(max),
	@rt_user_id			varchar(10) = NULL,	-- approver terakhir; NULL = semua approver di level tsb
	@debug				bit = 0				-- 1 = print body, TIDAK kirim HTTP
AS
SET NOCOUNT ON

DECLARE @f_type				varchar(1) = 'C'
DECLARE @f_api_mail			varchar(max)
DECLARE @f_prepared_by		varchar(30)
DECLARE @f_descs			varchar(max)
DECLARE @f_email_addr		varchar(255)
DECLARE @f_user_name		varchar(255)
DECLARE @f_sender			varchar(max)
DECLARE @f_sender_addr		varchar(max)
DECLARE @f_approved_date	datetime
DECLARE @f_approve_exist	varchar(max)
DECLARE @f_entity_name		varchar(255)
DECLARE @msg				nvarchar(2047)
DECLARE @p					int

-- HTTP / OLE
DECLARE @URL				nvarchar(max)
DECLARE @Body				nvarchar(max)
DECLARE @Object				int
DECLARE @hr					int
DECLARE @err				int
DECLARE @http_status		int
DECLARE @ResponseText		varchar(8000)
DECLARE @ole_src			varchar(255)
DECLARE @ole_desc			varchar(2000)

SET @rt_user_id = NULLIF(LTRIM(RTRIM(@rt_user_id)), '')
SET @rt_reason  = ISNULL(NULLIF(NULLIF(LTRIM(RTRIM(@rt_reason)), ''), '0'), 'no note')

IF @rt_status NOT IN ('A', 'M', 'R')
BEGIN
	IF @debug = 1 RAISERROR('EXIT: status %s bukan A/M/R', 0, 1, @rt_status) WITH NOWAIT
	RETURN
END

-- URL aplikasi approval (tanpa slash di akhir) - samakan dengan SP x_send_mail_approval_po_request
--SELECT @f_api_mail = api_mail FROM mgr.ar_spec (NOLOCK)
SET @f_api_mail = 'http://10.10.0.25:7354'
SET @URL = ISNULL(@f_api_mail, '') + '/api/maildata'

-- ---------------- Penerima: pembuat PR ----------------
SELECT TOP 1
	@f_prepared_by = a.prepared_by,
	@f_descs = REPLACE(REPLACE(REPLACE(REPLACE(a.remarks, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', '')
FROM mgr.po_authorized_person a
WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
  AND a.type = @f_type AND a.module = @rt_module AND a.trx_type = @rt_trx_type
  AND a.prepared_by IS NOT NULL
ORDER BY a.level_no

SELECT @f_email_addr = email_add, @f_user_name = description
FROM mgr.security_users (NOLOCK) WHERE name = @f_prepared_by

IF LTRIM(RTRIM(ISNULL(@f_email_addr, ''))) = ''
BEGIN
	IF @debug = 1
	BEGIN
		SET @msg = CONCAT('EXIT: email pembuat PR tidak ditemukan (prepared_by=', ISNULL(@f_prepared_by, 'NULL'), ')')
		RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
	END
	RETURN
END

-- ---------------- Thank you: approver terakhir yang memproses ----------------
SELECT @f_sender      = STRING_AGG(CAST(ISNULL(u.description, a.user_id) AS varchar(max)), '; '),
	   @f_sender_addr = STRING_AGG(CAST(ISNULL(u.email_add, '') AS varchar(max)), '; '),
	   @f_approved_date = MAX(a.approved_date)
FROM mgr.po_authorized_person a
LEFT JOIN mgr.security_users u (NOLOCK) ON u.name = a.user_id
WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
  AND a.type = @f_type AND a.module = @rt_module AND a.trx_type = @rt_trx_type
  AND a.level_no = @rt_level_no AND a.status = @rt_status
  AND (@rt_user_id IS NULL OR a.user_id = @rt_user_id)

-- ---------------- Daftar approver yang sudah approve ----------------
SELECT @f_approve_exist = STRING_AGG(CAST(ISNULL(u.description, a.user_id) AS varchar(max)), '; ')
						  WITHIN GROUP (ORDER BY a.level_no)
FROM mgr.po_authorized_person a
LEFT JOIN mgr.security_users u (NOLOCK) ON u.name = a.user_id
WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
  AND a.type = @f_type AND a.module = @rt_module AND a.trx_type = @rt_trx_type
  AND a.status = 'A'

SELECT @f_entity_name = entity_name
FROM mgr.cf_entity (NOLOCK) WHERE entity_cd = @rt_entity_cd

SET @Body = (
	SELECT
		'PoRequestFeedback'							AS module,
		ISNULL(@rt_entity_cd, '')					AS entity_cd,
		ISNULL(@rt_project_no, '')					AS project_no,
		ISNULL(@rt_doc_no, '')						AS doc_no,
		ISNULL(@rt_trx_type, '')					AS trx_type,
		@rt_status									AS status,
		ISNULL(@rt_level_no, '')					AS level_no,
		ISNULL(@f_prepared_by, '')					AS user_id,
		ISNULL(@f_email_addr, '')					AS email_addr,
		ISNULL(@f_user_name, '')					AS user_name,
		ISNULL(@f_entity_name, '')					AS entity_name,
		ISNULL(@f_descs, '')						AS descs,
		@rt_reason									AS reason,
		ISNULL(@f_sender, '')						AS sender,
		ISNULL(@f_sender_addr, '')					AS sender_addr,
		ISNULL(@f_approve_exist, 'EMPTY')			AS approve_exist,
		-- penanda unik per keputusan, supaya feedback revisi berikutnya di hari yang sama tetap terkirim
		ISNULL(FORMAT(@f_approved_date, 'yyyyMMddHHmmss'), '')	AS feedback_key
	FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
)

IF @debug = 1
BEGIN
	SET @msg = CONCAT('---- FEEDBACK BODY (', LEN(@Body), ' char) URL=', @URL, ' ----')
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
	SET @p = 1
	WHILE @p <= LEN(@Body)
	BEGIN
		PRINT SUBSTRING(@Body, @p, 4000)
		SET @p += 4000
	END
	RETURN
END

-- ---------------- POST ke API mail ----------------
EXEC @hr = sp_OACreate 'MSXML2.ServerXMLHTTP.6.0', @Object OUT
SET @err = @@ERROR
IF @err <> 0
BEGIN
	RAISERROR('Error Validating URL (OLE Automation)', 16, -1)
	RETURN
END

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

SELECT ISNULL(@ResponseText, 'NULL')	AS ResponseText,
	   @hr							AS HrResult,
	   @http_status					AS HttpStatus,
	   @rt_status					AS Status,
	   @f_prepared_by				AS PreparedBy,
	   @ole_desc					AS OleError,
	   CAST(CASE WHEN @hr = 0 AND (@ResponseText LIKE 'Email berhasil dikirim ke: %'
							   OR @ResponseText LIKE 'Email has already been sent to: %')
				 THEN 1 ELSE 0 END AS bit)	AS SentOk

RETURN
GO
