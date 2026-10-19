/*
 * mgr.x_send_mail_approval_po_request_m
 *
 * Approval Purchase Requisition + kirim email ke approver berikutnya.
 * Dipanggil oleh aplikasi (POST /api/porequest/getaccess) dan oleh ERP saat submit (level 0).
 *
 * File ini sengaja di luar folder database/ utama supaya TIDAK ikut dijalankan `npm run migrate`.
 * Jalankan manual di database tujuan.
 *
 * Status: A = Approve, M = Revise, R = Reject.
 * po_authorized_person.status: O = giliran approve, N = belum giliran, A/M/R = sudah diproses.
 */
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [mgr].[x_send_mail_approval_po_request_m]
	@rt_entity_cd		varchar(4),
	@rt_project_no		varchar(20),
	@rt_doc_no			varchar(30),
	@rt_trx_type		varchar(4),
	@rt_module			varchar(4),
	@rt_status			varchar(1),
	@rt_level_no		varchar(12),
	@rt_reason			varchar(max),
	@rt_user_id			varchar(10) = NULL,	-- approver yang memproses; NULL = semua approver di level tsb (perilaku lama)
	@debug				bit = 0				-- 1 = print semua langkah + body, TIDAK kirim HTTP
AS
SET NOCOUNT ON

DECLARE @rt_level			int = ISNULL(TRY_CAST(@rt_level_no AS int), 0)
DECLARE @f_type				varchar(1) = 'C'	-- type approver di po_authorized_person
DECLARE @f_api_mail			varchar(max)
DECLARE @f_entity_name		varchar(255)
DECLARE @f_url_file			varchar(max)
DECLARE @f_file_name		varchar(max)
DECLARE @f_approve_exist	varchar(max) = 'EMPTY'
DECLARE @f_clarify_user		varchar(max)
DECLARE @f_clarify_email	varchar(max)
DECLARE @sql				nvarchar(max)
DECLARE @err_msg			nvarchar(2048)
DECLARE @msg				nvarchar(2047)
DECLARE @rows				int
DECLARE @i					int = 1
DECLARE @n					int
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

IF @debug = 1
BEGIN
	SET @msg = CONCAT('PARAM: entity=', @rt_entity_cd, ' project=', @rt_project_no, ' doc=', @rt_doc_no,
					  ' trx_type=', @rt_trx_type, ' module=', @rt_module, ' status=', @rt_status,
					  ' level=', @rt_level, ' user_id=', ISNULL(@rt_user_id, '(semua)'), ' type=', @f_type)
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
END

-- ======================================================================
-- 1. UPDATE APPROVAL (hanya bagian ini yang dalam transaksi)
--    level N approve -> kalau ada level berikutnya: buka (N -> O) lalu kirim email
--                    -> kalau tidak ada: PR final approved
-- ======================================================================
IF @rt_level > 0
BEGIN
	BEGIN TRY
		BEGIN TRANSACTION

		IF @rt_status IN ('A', 'M', 'R')
		BEGIN
			-- a. proses approver ini di level saat ini (harus masih 'O')
			UPDATE mgr.po_authorized_person
			SET status = @rt_status, approved_date = GETDATE(), note_approval = @rt_reason
			WHERE entity_cd = @rt_entity_cd AND doc_no = @rt_doc_no
			  AND trx_type = @rt_trx_type AND module = @rt_module
			  AND level_no = @rt_level_no
			  AND (@rt_user_id IS NULL OR user_id = @rt_user_id)
			  AND status = 'O'

			SET @rows = @@ROWCOUNT
			IF @debug = 1
			BEGIN
				SET @msg = CONCAT('UPDATE level ', @rt_level, ' user ', ISNULL(@rt_user_id, '(semua)'),
								  ' O -> ', @rt_status, ' : ', @rows, ' baris')
				RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
			END

			-- sudah diproses / bukan gilirannya -> jangan buka level berikut & jangan kirim email lagi
			IF @rows = 0
				RAISERROR('Level %s user %s dokumen %s tidak berstatus O (sudah diproses?)', 16, 1,
						  @rt_level_no, @rt_user_id, @rt_doc_no)
		END

		-- b. REVISE / REJECT: selesai, tidak kirim email
		IF @rt_status IN ('M', 'R')
		BEGIN
			COMMIT TRANSACTION
			IF @debug = 1 RAISERROR('EXIT: status M/R, tidak kirim email', 0, 1) WITH NOWAIT
			RETURN
		END

		-- c. masih ada approver lain di level yang sama yang belum approve -> tunggu
		IF EXISTS (SELECT 1 FROM mgr.po_authorized_person
				   WHERE entity_cd = @rt_entity_cd AND doc_no = @rt_doc_no
					 AND type = @f_type AND module = @rt_module AND trx_type = @rt_trx_type
					 AND level_no = @rt_level_no AND status = 'O')
		BEGIN
			COMMIT TRANSACTION
			IF @debug = 1 RAISERROR('EXIT: approver lain di level yang sama belum approve', 0, 1) WITH NOWAIT
			RETURN
		END

		-- d. buka level berikutnya: N -> O
		UPDATE a
		SET status = 'O'
		FROM mgr.po_authorized_person a
		WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
		  AND a.type = @f_type AND a.module = @rt_module AND a.trx_type = @rt_trx_type
		  AND a.status = 'N'
		  AND a.level_no = (SELECT MIN(l.level_no) FROM mgr.po_authorized_person l
							WHERE l.entity_cd = a.entity_cd AND l.doc_no = a.doc_no
							  AND l.type = a.type AND l.module = a.module AND l.trx_type = a.trx_type
							  AND l.level_no > @rt_level AND l.status = 'N')

		SET @rows = @@ROWCOUNT
		IF @debug = 1
		BEGIN
			SET @msg = CONCAT('Buka level berikutnya N -> O : ', @rows, ' baris')
			RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
		END

		-- e. tidak ada level berikutnya -> PR final approved
		IF @rows = 0
		BEGIN
			UPDATE mgr.po_request_hd
			SET approved_status = 'A'
			WHERE entity_cd = @rt_entity_cd AND request_no = @rt_doc_no AND request_trx_type = @rt_trx_type

			EXEC mgr.for_delay_ftp @rt_entity_cd

			COMMIT TRANSACTION

			IF @debug = 1 RAISERROR('EXIT: level terakhir, PR final approved', 0, 1) WITH NOWAIT
			RETURN
		END

		COMMIT TRANSACTION
		-- lanjut ke bagian 2: kirim email ke level yang baru dibuka
	END TRY
	BEGIN CATCH
		IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
		SET @err_msg = 'Could Not UPDATE PO Request Approval: ' + ERROR_MESSAGE()
		RAISERROR(@err_msg, 16, -1)
		RETURN
	END CATCH
END

-- ======================================================================
-- 2. PENERIMA EMAIL = approver di level terendah yang status 'O'
-- ======================================================================
DECLARE @recipients TABLE (
	row_id		int IDENTITY(1,1) PRIMARY KEY,
	user_id		varchar(10),
	level_no	varchar(12),
	descs		varchar(max),
	approve_seq	varchar(255),
	email_addr	varchar(255),
	user_name	varchar(255),
	sender		varchar(255),
	sender_addr	varchar(255)
)

INSERT INTO @recipients (user_id, level_no, descs, email_addr, user_name, sender, sender_addr)
SELECT a.user_id,
	   CAST(a.level_no AS varchar(12)),
	   REPLACE(REPLACE(REPLACE(REPLACE(a.remarks, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''),
	   u.email_add, u.description,
	   u.description, u.email_add	-- sender = staff_id = a.user_id (sama seperti versi lama)
FROM mgr.po_authorized_person a
LEFT JOIN mgr.security_users u (NOLOCK) ON u.name = a.user_id
WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
  AND a.status = 'O' AND a.type = @f_type AND a.module = @rt_module AND a.trx_type = @rt_trx_type
  AND a.level_no = (SELECT MIN(l.level_no)
					FROM mgr.po_authorized_person l
					WHERE l.entity_cd = a.entity_cd AND l.doc_no = a.doc_no
					  AND l.status = 'O' AND l.type = a.type AND l.module = a.module AND l.trx_type = a.trx_type)

SET @n = @@ROWCOUNT

IF @debug = 1
BEGIN
	SET @msg = CONCAT('Jumlah penerima: ', @n)
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
END

IF @n = 0
BEGIN
	IF @debug = 1 RAISERROR('EXIT: tidak ada approver status O', 0, 1) WITH NOWAIT
	RETURN
END

-- ======================================================================
-- 3. DATA HEADER (sekali saja)
-- ======================================================================
-- URL aplikasi approval (tanpa slash di akhir), contoh: https://approval.kemvil.co.id
--SELECT @f_api_mail = api_mail FROM mgr.ar_spec (NOLOCK)
SET @URL = ISNULL(@f_api_mail, '') + '/api/maildata'

SELECT @f_entity_name = entity_name
FROM mgr.cf_entity (NOLOCK) WHERE entity_cd = @rt_entity_cd

-- ---------------- Attachment ----------------
-- EMPTY kalau: tabel/kolom tidak ada, tidak ada baris, atau url bukan http.
-- Pakai dynamic SQL supaya SP tetap bisa compile walau kolom belum ada.
IF COL_LENGTH('mgr.po_pr_attachment', 'url_fin') IS NOT NULL
BEGIN
	SET @sql = N'
		SELECT @url_file  = STRING_AGG(CAST(LTRIM(RTRIM(url_fin)) AS varchar(max)), ''; '')
								WITHIN GROUP (ORDER BY url_fin),
			   @file_name = STRING_AGG(CAST(' +
			CASE WHEN COL_LENGTH('mgr.po_pr_attachment', 'url_fin_descs') IS NOT NULL
				 THEN N'ISNULL(NULLIF(LTRIM(RTRIM(url_fin_descs)), ''''), ''EMPTY'')'
				 ELSE N'''EMPTY''' END + N' AS varchar(max)), ''; '')
								WITHIN GROUP (ORDER BY url_fin)
		FROM mgr.po_pr_attachment WITH (NOLOCK)
		WHERE entity_cd = @entity_cd AND project_no = @project_no AND doc_no = @doc_no
		  AND LTRIM(url_fin) LIKE ''http%'''

	BEGIN TRY
		EXEC sp_executesql @sql,
			N'@entity_cd varchar(4), @project_no varchar(20), @doc_no varchar(30),
			  @url_file varchar(max) OUTPUT, @file_name varchar(max) OUTPUT',
			@rt_entity_cd, @rt_project_no, @rt_doc_no, @f_url_file OUTPUT, @f_file_name OUTPUT
	END TRY
	BEGIN CATCH
		IF @debug = 1
		BEGIN
			SET @msg = 'Attachment query error: ' + ERROR_MESSAGE()
			RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
		END
		SELECT @f_url_file = NULL, @f_file_name = NULL
	END CATCH
END
ELSE IF @debug = 1
	RAISERROR('Kolom/tabel po_pr_attachment.url_fin tidak ada -> EMPTY', 0, 1) WITH NOWAIT

SELECT @f_url_file  = ISNULL(NULLIF(@f_url_file, ''), 'EMPTY'),
	   @f_file_name = ISNULL(NULLIF(@f_file_name, ''), 'EMPTY')

-- ---------------- Approver sebelumnya & kontak klarifikasi ----------------
IF @rt_level > 0
BEGIN
	SELECT @f_approve_exist = ISNULL(STRING_AGG(CAST(user_id AS varchar(max)), '; ')
								WITHIN GROUP (ORDER BY level_no), 'EMPTY')
	FROM mgr.po_authorized_person
	WHERE entity_cd = @rt_entity_cd AND project_no = @rt_project_no AND doc_no = @rt_doc_no
	  AND status = 'A' AND trx_type = @rt_trx_type AND module = @rt_module
	  AND user_id IS NOT NULL

	-- kontak klarifikasi = approver di level yang baru saja approve
	SELECT @f_clarify_email = ISNULL(STRING_AGG(CAST(ISNULL(u.email_add, 'EMPTY') AS varchar(max)), '; '), 'EMPTY'),
		   @f_clarify_user  = ISNULL(STRING_AGG(CAST(ISNULL(u.description, 'EMPTY') AS varchar(max)), '; '), 'EMPTY')
	FROM mgr.po_authorized_person a
	JOIN mgr.security_users u (NOLOCK) ON u.name = a.user_id
	WHERE a.entity_cd = @rt_entity_cd AND a.doc_no = @rt_doc_no
	  AND a.trx_type = @rt_trx_type AND a.module = @rt_module AND a.level_no = @rt_level_no
END

IF @debug = 1
BEGIN
	SET @msg = CONCAT('URL=', @URL, ' | entity_name=', @f_entity_name, ' | approve_exist=', @f_approve_exist,
					  ' | clarify_user=', @f_clarify_user, ' | clarify_email=', @f_clarify_email)
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
	SET @msg = LEFT(CONCAT('url_file=', @f_url_file, ' | file_name=', @f_file_name), 2047)
	RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
END

-- ======================================================================
-- 4. KIRIM EMAIL (1 objek OLE dipakai ulang untuk semua penerima)
-- ======================================================================
DECLARE @log TABLE (
	ResponseText	varchar(8000),
	HrResult		int,
	HttpStatus		int,
	LevelNo			varchar(12),
	UserId			varchar(10),
	OleError		varchar(2000),
	SentOk			bit
)

IF @debug = 0
BEGIN
	EXEC @hr = sp_OACreate 'MSXML2.ServerXMLHTTP.6.0', @Object OUT
	SET @err = @@ERROR
	IF @err <> 0
	BEGIN
		-- approval sudah ter-commit; ini hanya gagal kirim email
		RAISERROR('Error Validating URL (OLE Automation)', 16, -1)
		RETURN
	END

	IF @hr = 0
		EXEC sp_OAMethod @Object, 'setTimeouts', NULL, 10000, 10000, 30000, 60000
	ELSE
		EXEC sp_OAGetErrorInfo NULL, @ole_src OUT, @ole_desc OUT
END

WHILE @i <= @n
BEGIN
	IF @Object IS NOT NULL
		SELECT @hr = 0, @http_status = NULL, @ResponseText = NULL, @ole_src = NULL, @ole_desc = NULL

	SET @Body = (
		SELECT
			'PoRequest'								AS module,
			ISNULL(@rt_module, '')					AS appr_module,
			@f_type									AS appr_type,
			ISNULL(@rt_entity_cd, '')				AS entity_cd,
			ISNULL(@rt_project_no, '')				AS project_no,
			ISNULL(@rt_doc_no, '')					AS doc_no,
			ISNULL(@rt_trx_type, '')				AS trx_type,
			ISNULL(r.approve_seq, '')				AS approve_seq,
			ISNULL(r.level_no, '')					AS level_no,
			ISNULL(r.user_id, '')					AS user_id,
			ISNULL(r.sender, '')					AS sender,
			ISNULL(r.sender_addr, '')				AS sender_addr,
			@f_url_file								AS url_file,
			@f_file_name							AS file_name,
			ISNULL(@f_entity_name, '')				AS entity_name,
			ISNULL(r.email_addr, '')				AS email_addr,
			ISNULL(r.descs, '')						AS descs,
			ISNULL(r.user_name, '')					AS user_name,
			@f_approve_exist						AS approve_exist,
			ISNULL(CASE WHEN @rt_level = 0 THEN r.sender      ELSE @f_clarify_user  END, '') AS clarify_user,
			ISNULL(CASE WHEN @rt_level = 0 THEN r.sender_addr ELSE @f_clarify_email END, '') AS clarify_email,
			ISNULL(@rt_reason, '')					AS reason
		FROM @recipients r
		WHERE r.row_id = @i
		FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
	)

	IF @debug = 1
	BEGIN
		SET @msg = CONCAT('---- BODY ', @i, '/', @n, ' (', LEN(@Body), ' char) ----')
		RAISERROR('%s', 0, 1, @msg) WITH NOWAIT
		-- PRINT maks 4000 char nvarchar -> dipotong per 4000 supaya keluar semua
		SET @p = 1
		WHILE @p <= LEN(@Body)
		BEGIN
			PRINT SUBSTRING(@Body, @p, 4000)
			SET @p += 4000
		END
	END
	ELSE
	BEGIN
		IF @hr = 0
		BEGIN
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
		END

		INSERT INTO @log
		SELECT ISNULL(@ResponseText, 'NULL'), @hr, @http_status, r.level_no, r.user_id, @ole_desc,
			   CASE WHEN @hr = 0 AND (@ResponseText LIKE 'Email berhasil dikirim ke: %'
								   OR @ResponseText LIKE 'Email has already been sent to: %')
					THEN 1 ELSE 0 END
		FROM @recipients r WHERE r.row_id = @i
	END

	SET @i += 1
END

IF @Object IS NOT NULL EXEC sp_OADestroy @Object

IF @debug = 0
	SELECT ResponseText, HrResult, HttpStatus, LevelNo, UserId, OleError, SentOk
	FROM @log

RETURN
GO
