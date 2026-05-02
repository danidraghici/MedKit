-- =============================================================================
-- Migration 010: Add AI Insights columns
-- =============================================================================
-- Run against: MedKitDB
-- Depends on: schema.sql (lab_results, lab_ai_insights tables must exist)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AI processing tracking on lab_results
--    Lets the UI poll for processing status without querying lab_ai_insights.
-- -----------------------------------------------------------------------------
ALTER TABLE lab_results
    ADD ai_processing_status NVARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT CK_lab_results_ai_status
        CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
GO

ALTER TABLE lab_results
    ADD ai_processing_error NVARCHAR(MAX) NULL;
GO

ALTER TABLE lab_results
    ADD ai_processing_started_at DATETIMEOFFSET(7) NULL;
GO

ALTER TABLE lab_results
    ADD ai_processing_completed_at DATETIMEOFFSET(7) NULL;
GO

-- Index for querying pending/processing results (used by LabAnalysisJob)
CREATE INDEX IX_lab_results_ai_status ON lab_results (ai_processing_status)
    WHERE ai_processing_status IN ('pending', 'processing');
GO

-- -----------------------------------------------------------------------------
-- 2. Dual-render columns on lab_ai_insights
--    Existing columns (summary, findings, recommendations) = doctor variant.
--    New *_patient columns = simplified language for patient portal.
-- -----------------------------------------------------------------------------
ALTER TABLE lab_ai_insights
    ADD summary_patient NVARCHAR(MAX) NULL;
GO

ALTER TABLE lab_ai_insights
    ADD findings_patient NVARCHAR(MAX) NULL;       -- JSON array, limbaj simplu
GO

ALTER TABLE lab_ai_insights
    ADD recommendations_patient NVARCHAR(MAX) NULL; -- JSON array, limbaj simplu
GO

ALTER TABLE lab_ai_insights
    ADD prompt_version NVARCHAR(50) NULL;           -- ex: "v1.0.0"
GO

-- -----------------------------------------------------------------------------
-- 3. AI system user placeholder
--    Generate a GUID with NEWID() and replace <GUID> below, then run once.
--    Store the GUID in appsettings under AiInsights:AiSystemUserId.
--    The password_hash value is intentionally invalid — this account cannot
--    authenticate via the normal login flow.
-- -----------------------------------------------------------------------------
-- INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
-- VALUES (
--     '<GUID>',
--     'ai-system@medkit.internal',
--     'NOT_A_REAL_HASH',
--     'AI System',
--     'admin',
--     1,
--     SYSDATETIMEOFFSET(),
--     SYSDATETIMEOFFSET()
-- );
