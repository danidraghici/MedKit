-- =============================================================================
-- Migration 011: Revert lab_ai_insights.urgency constraint to English values
-- =============================================================================
-- Migration 006 translated urgency to Romanian ('Monitorizare', 'Consultați medicul').
-- The AI layer uses English enum values ('Monitor', 'Consult Doctor') because they
-- are machine-identifiers passed from the LLM prompt to the C# validator and DB.
-- This migration re-aligns the DB constraint with the code.
-- =============================================================================

ALTER TABLE lab_ai_insights DROP CONSTRAINT CK_lab_ai_insights_urgency;
GO

-- Backfill any existing rows that were stored with Romanian values.
UPDATE lab_ai_insights SET urgency = 'Monitor'        WHERE urgency = 'Monitorizare';
UPDATE lab_ai_insights SET urgency = 'Consult Doctor' WHERE urgency = 'Consultați medicul';
GO

ALTER TABLE lab_ai_insights ADD CONSTRAINT CK_lab_ai_insights_urgency
    CHECK (urgency IN ('Normal', 'Monitor', 'Consult Doctor', 'Urgent'));
GO
