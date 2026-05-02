-- =============================================================================
-- Migration 009: Translate lab_requests.status to Romanian
-- Migration 006 translated most enum columns but missed lab_requests.status.
-- The service already uses Romanian values (N'În așteptare', N'În procesare',
-- N'Finalizat'), so this migration aligns the DB constraint with the code.
-- NOTE: N'' prefix is required for NVARCHAR columns with non-ASCII characters.
-- =============================================================================

USE MedKitDB;
GO

-- Drop the old English constraint (idempotent: ignore error if already dropped)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_lab_requests_status')
    ALTER TABLE lab_requests DROP CONSTRAINT CK_lab_requests_status;
GO

-- Fix all values: handle English originals, correct Romanian, and garbled Romanian
-- (garbled = non-N'' literals stored by earlier migration attempts, e.g. 'În a?teptare')
UPDATE lab_requests SET status = N'Finalizat'     WHERE status IN ('Completed',   N'Finalizat');
UPDATE lab_requests SET status = N'În procesare'  WHERE status IN ('In Progress', N'În procesare') OR status LIKE N'%procesare%';
-- Everything else (Pending, garbled 'În așteptare', etc.) becomes 'În așteptare'
UPDATE lab_requests SET status = N'În așteptare'
WHERE status NOT IN (N'În așteptare', N'În procesare', N'Finalizat');
GO

ALTER TABLE lab_requests ADD CONSTRAINT CK_lab_requests_status
    CHECK (status IN (N'În așteptare', N'În procesare', N'Finalizat'));
GO

-- =============================================================================
-- Fix medical_records.urgency (Migration 006 may not have applied correctly)
-- =============================================================================

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_medical_records_urgency')
    ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_urgency;
GO

-- Diagnostic: run this to see what is actually stored before the fix
SELECT urgency,
       LEN(urgency)                          AS len,
       CONVERT(VARBINARY(50), urgency)       AS hex_bytes,
       COUNT(*)                              AS row_count
FROM medical_records
GROUP BY urgency;
GO

-- Step 1: plain English originals (stored correctly if inserted before any migration)
UPDATE medical_records SET urgency = N'Urgență' WHERE urgency = 'Emergency';
UPDATE medical_records SET urgency = N'Rutină'  WHERE urgency = 'Routine';
GO

-- Step 2: anything that looks like an Emergency/Urgenta variant (starts with 'Urgen', not 'Urgent')
UPDATE medical_records SET urgency = N'Urgență'
WHERE urgency NOT IN (N'Rutină', N'Semi-urgent', N'Urgent', N'Urgență')
  AND LEFT(LOWER(urgency COLLATE SQL_Latin1_General_CP1_CI_AS), 5) = 'urgen';
GO

-- Step 3: true catch-all — every remaining non-valid value becomes Rutină
-- (covers empty strings, garbled bytes, any other unexpected value)
UPDATE medical_records SET urgency = N'Rutină'
WHERE urgency NOT IN (N'Rutină', N'Semi-urgent', N'Urgent', N'Urgență');
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_urgency
    CHECK (urgency IN (N'Rutină', N'Semi-urgent', N'Urgent', N'Urgență'));
GO

-- =============================================================================
-- Fix medical_records.visit_type (migrations 006 + 008 had same encoding issue)
-- Target constraint: ('În persoană', 'Telemedicină', 'Urgență', 'Consult', 'Procedură')
-- =============================================================================

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_medical_records_visit_type')
    ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_visit_type;
GO

-- Use LIKE on the ASCII-stable prefix of each value to catch English, garbled, and correct variants
UPDATE medical_records SET visit_type = N'Telemedicină' WHERE visit_type LIKE 'Telemedici%';
UPDATE medical_records SET visit_type = N'Procedură'    WHERE visit_type LIKE 'Proced%';
-- 'Consult' is pure ASCII — already correct; also catch 'Follow-up' and garbled 'Urmărire' (starts 'Urm')
UPDATE medical_records SET visit_type = N'Consult'
    WHERE visit_type IN ('Follow-up', 'Consult') OR visit_type LIKE 'Urm%';
-- 'Urgență' in visit_type: starts 'Urgen%' or is 'Emergency'
UPDATE medical_records SET visit_type = N'Urgență'
    WHERE visit_type = 'Emergency' OR visit_type LIKE 'Urgen%';
-- Everything else (In-person, La cabinet, garbled 'În persoană', etc.) → 'În persoană'
UPDATE medical_records SET visit_type = N'În persoană'
    WHERE visit_type NOT IN (N'În persoană', N'Telemedicină', N'Urgență', N'Consult', N'Procedură');
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_visit_type
    CHECK (visit_type IN (N'În persoană', N'Telemedicină', N'Urgență', N'Consult', N'Procedură'));
GO
