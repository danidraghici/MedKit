-- =============================================================================
-- Migration 008: Rename visit_type values to match frontend labels
--   'La cabinet'  → 'În persoană'
--   'Urmărire'    → 'Consult'
-- =============================================================================

ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_visit_type;
GO

UPDATE medical_records SET visit_type = N'În persoană' WHERE visit_type IN ('La cabinet', N'În persoană');
UPDATE medical_records SET visit_type = N'Consult'     WHERE visit_type IN ('Urmărire', N'Consult');
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_visit_type
    CHECK (visit_type IN (N'În persoană', N'Telemedicină', N'Urgență', N'Consult', N'Procedură'));
GO
