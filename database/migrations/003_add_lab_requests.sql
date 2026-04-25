-- =============================================================================
-- Migration 003: Lab Requests Workflow
-- Adds lab_requests and lab_request_results tables with audit trigger.
-- Run against MedKitDB after schema.sql has been applied.
-- =============================================================================

USE MedKitDB;
GO

-- -----------------------------------------------------------------------------
-- 1. lab_requests
--    Created when a specialist doctor collects samples during a consultation.
--    Drives the lab doctor queue workflow.
-- -----------------------------------------------------------------------------
CREATE TABLE lab_requests (
    id                     UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    medical_record_id      UNIQUEIDENTIFIER  NOT NULL,
    patient_id             UNIQUEIDENTIFIER  NOT NULL,
    requested_by_doctor_id UNIQUEIDENTIFIER  NOT NULL,
    sample_types           NVARCHAR(500)     NOT NULL,  -- comma-separated: "blood,urine"
    status                 NVARCHAR(20)      NOT NULL DEFAULT 'Pending',
    notes                  NVARCHAR(MAX)     NULL,
    viewed_by_lab_at       DATETIMEOFFSET(7) NULL,      -- NULL = unread by lab doctors
    created_at             DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at             DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT PK_lab_requests                PRIMARY KEY (id),
    CONSTRAINT FK_lab_requests_medical_record FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE CASCADE,
    CONSTRAINT FK_lab_requests_patient        FOREIGN KEY (patient_id)
        REFERENCES patients(id),
    CONSTRAINT FK_lab_requests_doctor         FOREIGN KEY (requested_by_doctor_id)
        REFERENCES doctors(id),
    CONSTRAINT CK_lab_requests_status         CHECK (status IN ('Pending', 'In Progress', 'Completed'))
);

CREATE INDEX IX_lab_requests_patient_id        ON lab_requests (patient_id);
CREATE INDEX IX_lab_requests_medical_record_id ON lab_requests (medical_record_id);
CREATE INDEX IX_lab_requests_status            ON lab_requests (status);
CREATE INDEX IX_lab_requests_unread            ON lab_requests (viewed_by_lab_at) WHERE viewed_by_lab_at IS NULL;
GO

-- -----------------------------------------------------------------------------
-- 2. lab_request_results
--    Stores result submissions by lab doctors (text observations + optional file).
-- -----------------------------------------------------------------------------
CREATE TABLE lab_request_results (
    id                   UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    lab_request_id       UNIQUEIDENTIFIER  NOT NULL,
    submitted_by_user_id UNIQUEIDENTIFIER  NOT NULL,
    observations         NVARCHAR(MAX)     NULL,
    lab_result_id        UNIQUEIDENTIFIER  NULL,
    submitted_at         DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT PK_lab_request_results              PRIMARY KEY (id),
    CONSTRAINT FK_lab_request_results_request      FOREIGN KEY (lab_request_id)
        REFERENCES lab_requests(id) ON DELETE CASCADE,
    CONSTRAINT FK_lab_request_results_user         FOREIGN KEY (submitted_by_user_id)
        REFERENCES users(id),
    CONSTRAINT FK_lab_request_results_lab_result   FOREIGN KEY (lab_result_id)
        REFERENCES lab_results(id) ON DELETE SET NULL
);

CREATE INDEX IX_lab_request_results_request_id ON lab_request_results (lab_request_id);
GO

-- -----------------------------------------------------------------------------
-- 3. Audit trigger for lab_requests (same pattern as existing triggers)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('trg_audit_lab_requests', 'TR') IS NOT NULL DROP TRIGGER trg_audit_lab_requests;
GO
CREATE TRIGGER trg_audit_lab_requests
ON lab_requests
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
            'lab_requests',
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
            @performed_by, 'DELETE', 'lab_requests', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO
