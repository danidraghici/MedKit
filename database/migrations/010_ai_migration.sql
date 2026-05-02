-- 1. Status processing pentru lab_results (UI need to know if AI is still working)
ALTER TABLE lab_results 
    ADD ai_processing_status NVARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT CK_lab_results_ai_status 
        CHECK (ai_processing_status IN ('pending','processing','completed','failed','skipped'));

ALTER TABLE lab_results 
    ADD ai_processing_error NVARCHAR(MAX) NULL;

ALTER TABLE lab_results 
    ADD ai_processing_started_at  DATETIMEOFFSET(7) NULL;
ALTER TABLE lab_results 
    ADD ai_processing_completed_at DATETIMEOFFSET(7) NULL;

-- 2. Render dual în lab_ai_insights — adaugă variantă pentru pacient
-- Coloana existentă `summary` rămâne pentru doctor (registru clinic).
ALTER TABLE lab_ai_insights 
    ADD summary_patient NVARCHAR(MAX) NULL;

ALTER TABLE lab_ai_insights 
    ADD findings_patient NVARCHAR(MAX) NULL;        -- JSON array, limbaj simplu

ALTER TABLE lab_ai_insights 
    ADD recommendations_patient NVARCHAR(MAX) NULL; -- JSON array, limbaj simplu

ALTER TABLE lab_ai_insights 
    ADD prompt_version NVARCHAR(50) NULL;           -- ex: "v1.0.0"

-- 3. User de sistem pentru AI (audit trail)
-- (Inserează manual cu un GUID generat. Folosește acest GUID în appsettings.)
-- INSERT INTO users (id, email, password_hash, name, role, is_active)
-- VALUES (NEWID(), 'ai-system@medkit.internal', 'NOT_A_REAL_HASH', 'AI System', 'admin', 1);