-- =============================================================================
-- MedKit Migration: Add Departments
-- Run this against an existing MedKitDB instance (NOT a fresh schema install).
-- For a fresh install, use schema.sql which already includes these changes.
-- =============================================================================

USE MedKitDB;
GO

-- -----------------------------------------------------------------------------
-- Step 1: Create the departments table
-- -----------------------------------------------------------------------------
IF OBJECT_ID('departments', 'U') IS NULL
BEGIN
    CREATE TABLE departments (
        id          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
        name        NVARCHAR(255)     NOT NULL,
        description NVARCHAR(MAX)     NULL,
        created_at  DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at  DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_departments      PRIMARY KEY (id),
        CONSTRAINT UQ_departments_name UNIQUE (name)
    );
    CREATE INDEX IX_departments_name ON departments (name);
    PRINT 'Created departments table.';
END
ELSE
    PRINT 'departments table already exists, skipping.';
GO

-- -----------------------------------------------------------------------------
-- Step 2: Add departments audit trigger
-- -----------------------------------------------------------------------------
IF OBJECT_ID('trg_audit_departments', 'TR') IS NOT NULL DROP TRIGGER trg_audit_departments;
GO
CREATE TRIGGER trg_audit_departments
ON departments
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @action       NVARCHAR(10);
    DECLARE @performed_by UNIQUEIDENTIFIER;

    IF   EXISTS(SELECT 1 FROM inserted) AND EXISTS(SELECT 1 FROM deleted) SET @action = 'UPDATE';
    ELSE IF EXISTS(SELECT 1 FROM inserted)                                 SET @action = 'INSERT';
    ELSE                                                                   SET @action = 'DELETE';

    SET @performed_by = TRY_CAST(
        CAST(SESSION_CONTEXT(N'app_user_id') AS NVARCHAR(36)) AS UNIQUEIDENTIFIER
    );

    IF @action IN ('INSERT', 'UPDATE')
        INSERT INTO audit_logs (performed_by_user_id, action, entity_type, entity_id, old_values, new_values)
        SELECT
            @performed_by,
            @action,
            'departments',
            i.id,
            CASE WHEN @action = 'UPDATE'
                 THEN (SELECT TOP 1 * FROM deleted  WHERE id = i.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER)
                 ELSE NULL
            END,
            (SELECT TOP 1 * FROM inserted WHERE id = i.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER)
        FROM inserted i;
    ELSE
        INSERT INTO audit_logs (performed_by_user_id, action, entity_type, entity_id, old_values, new_values)
        SELECT
            @performed_by, 'DELETE', 'departments', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- -----------------------------------------------------------------------------
-- Step 3: Populate with 17 hospital departments
-- -----------------------------------------------------------------------------
INSERT INTO departments (id, name, description)
SELECT NEWID(), name, description
FROM (VALUES
    (N'Cardiology',          N'Diagnosis and treatment of heart and cardiovascular diseases'),
    (N'Dermatology',         N'Skin, hair, and nail conditions'),
    (N'Emergency Medicine',  N'Immediate care for acute illnesses and life-threatening conditions'),
    (N'Endocrinology',       N'Endocrine system disorders including diabetes and thyroid conditions'),
    (N'Gastroenterology',    N'Diseases of the digestive system and gastrointestinal tract'),
    (N'General Medicine',    N'Broad primary care and internal medicine consultations'),
    (N'General Surgery',     N'Elective and emergency surgical procedures across organ systems'),
    (N'Hematology',          N'Blood disorders including anaemia, clotting conditions, and blood cancers'),
    (N'Laboratory',          N'Clinical laboratory testing, pathology, and diagnostic services'),
    (N'Nephrology',          N'Kidney diseases, dialysis, and renal function management'),
    (N'Neurology',           N'Disorders of the nervous system including stroke and epilepsy'),
    (N'Oncology',            N'Cancer diagnosis, chemotherapy, radiation, and palliative care'),
    (N'Orthopedics',         N'Musculoskeletal conditions, fractures, and joint replacement'),
    (N'Pediatrics',          N'Medical care for infants, children, and adolescents'),
    (N'Psychiatry',          N'Mental health disorders and psychiatric therapy'),
    (N'Pulmonology',         N'Respiratory diseases including asthma, COPD, and lung cancer'),
    (N'Radiology',           N'Medical imaging including X-ray, CT, MRI, and ultrasound')
) AS src(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE departments.name = src.name
);

PRINT 'Populated departments table.';
GO

-- -----------------------------------------------------------------------------
-- Step 4: Add department_id FK column to doctors
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'doctors' AND COLUMN_NAME = 'department_id'
)
BEGIN
    ALTER TABLE doctors
        ADD department_id UNIQUEIDENTIFIER NULL
        CONSTRAINT FK_doctors_department
            FOREIGN KEY REFERENCES departments(id) ON DELETE SET NULL;

    CREATE INDEX IX_doctors_department_id ON doctors (department_id);
    PRINT 'Added department_id column to doctors.';
END
ELSE
    PRINT 'department_id column already exists on doctors, skipping.';
GO

-- -----------------------------------------------------------------------------
-- Step 5: Back-fill department_id from existing free-text department values
-- (case-insensitive match). Unmatched rows remain NULL.
-- -----------------------------------------------------------------------------
UPDATE d
SET    d.department_id = dep.id
FROM   doctors d
JOIN   departments dep
    ON dep.name = d.department COLLATE SQL_Latin1_General_CP1_CI_AS
WHERE  d.department_id IS NULL;

PRINT 'Back-filled department_id for existing doctors where name matched.';
GO

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------
SELECT 'departments rows' AS check_name, COUNT(*) AS result FROM departments
UNION ALL
SELECT 'doctors without department_id', COUNT(*) FROM doctors WHERE department_id IS NULL;
GO
