-- =============================================================================
-- Migration 006: Translate Enum Values to Romanian
-- Drops English CHECK constraints, updates existing data, re-creates constraints
-- with Romanian values.
-- Run against MedKitDB after all previous migrations have been applied.
-- =============================================================================

USE MedKitDB;
GO

-- =============================================================================
-- 1. patients.sex: 'Male' / 'Female' / 'Other'
-- =============================================================================
ALTER TABLE patients DROP CONSTRAINT CK_patients_sex;
GO

UPDATE patients SET sex = 'Masculin' WHERE sex = 'Male';
UPDATE patients SET sex = 'Feminin'  WHERE sex = 'Female';
UPDATE patients SET sex = 'Altul'    WHERE sex = 'Other';
GO

ALTER TABLE patients ADD CONSTRAINT CK_patients_sex
    CHECK (sex IN ('Masculin', 'Feminin', 'Altul'));
GO

-- =============================================================================
-- 2. patients.blood_type: 'Unknown' → 'Necunoscut' (symbols A+, B-, etc. unchanged)
-- =============================================================================
ALTER TABLE patients DROP CONSTRAINT CK_patients_blood_type;
GO

UPDATE patients SET blood_type = 'Necunoscut' WHERE blood_type = 'Unknown';
GO

ALTER TABLE patients ADD CONSTRAINT CK_patients_blood_type
    CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Necunoscut'));
GO

-- =============================================================================
-- 3. medical_records.visit_type
-- =============================================================================
ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_visit_type;
GO

UPDATE medical_records SET visit_type = 'La cabinet'   WHERE visit_type = 'In-person';
UPDATE medical_records SET visit_type = 'Telemedicină' WHERE visit_type = 'Telemedicine';
UPDATE medical_records SET visit_type = 'Urgență'      WHERE visit_type = 'Emergency';
UPDATE medical_records SET visit_type = 'Urmărire'     WHERE visit_type = 'Follow-up';
UPDATE medical_records SET visit_type = 'Procedură'    WHERE visit_type = 'Procedure';
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_visit_type
    CHECK (visit_type IN ('La cabinet', 'Telemedicină', 'Urgență', 'Urmărire', 'Procedură'));
GO

-- =============================================================================
-- 4. medical_records.urgency
-- =============================================================================
ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_urgency;
GO

UPDATE medical_records SET urgency = 'Rutină'      WHERE urgency = 'Routine';
UPDATE medical_records SET urgency = 'Semi-urgent' WHERE urgency = 'Semi-urgent'; -- unchanged
UPDATE medical_records SET urgency = 'Urgent'      WHERE urgency = 'Urgent';      -- unchanged
UPDATE medical_records SET urgency = 'Urgență'     WHERE urgency = 'Emergency';
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_urgency
    CHECK (urgency IN ('Rutină', 'Semi-urgent', 'Urgent', 'Urgență'));
GO

-- =============================================================================
-- 5. medical_records.follow_up_type
-- =============================================================================
ALTER TABLE medical_records DROP CONSTRAINT CK_medical_records_follow_up_type;
GO

UPDATE medical_records SET follow_up_type = 'Consultație la cabinet'              WHERE follow_up_type = 'Office visit';
UPDATE medical_records SET follow_up_type = 'Apel telefonic'                      WHERE follow_up_type = 'Phone call';
UPDATE medical_records SET follow_up_type = 'Analize de laborator'                WHERE follow_up_type = 'Lab work';
UPDATE medical_records SET follow_up_type = 'Imagistică'                          WHERE follow_up_type = 'Imaging';
UPDATE medical_records SET follow_up_type = 'Trimitere la specialist'             WHERE follow_up_type = 'Specialist referral';
UPDATE medical_records SET follow_up_type = 'Urgențe dacă simptomele se agravează' WHERE follow_up_type = 'ER if symptoms worsen';
UPDATE medical_records SET follow_up_type = 'Niciunul'                            WHERE follow_up_type = 'None';
GO

ALTER TABLE medical_records ADD CONSTRAINT CK_medical_records_follow_up_type
    CHECK (follow_up_type IS NULL OR follow_up_type IN (
        'Consultație la cabinet', 'Apel telefonic', 'Analize de laborator', 'Imagistică',
        'Trimitere la specialist', 'Urgențe dacă simptomele se agravează', 'Niciunul'
    ));
GO

-- =============================================================================
-- 6. prescribed_drugs.route
-- =============================================================================
ALTER TABLE prescribed_drugs DROP CONSTRAINT CK_prescribed_drugs_route;
GO

UPDATE prescribed_drugs SET route = 'Oral'          WHERE route = 'Oral';           -- unchanged
UPDATE prescribed_drugs SET route = 'IV'             WHERE route = 'IV';             -- unchanged
UPDATE prescribed_drugs SET route = 'IM'             WHERE route = 'IM';             -- unchanged
UPDATE prescribed_drugs SET route = 'Subcutanat'     WHERE route = 'Subcutaneous';
UPDATE prescribed_drugs SET route = 'Topic'          WHERE route = 'Topical';
UPDATE prescribed_drugs SET route = 'Inhalator'      WHERE route = 'Inhalation';
UPDATE prescribed_drugs SET route = 'Sublingual'     WHERE route = 'Sublingual';     -- unchanged
UPDATE prescribed_drugs SET route = 'Rectal'         WHERE route = 'Rectal';         -- unchanged
UPDATE prescribed_drugs SET route = 'Nazal'          WHERE route = 'Nasal';
UPDATE prescribed_drugs SET route = 'Oftalmic'       WHERE route = 'Ophthalmic';
UPDATE prescribed_drugs SET route = 'Transdermal'    WHERE route = 'Transdermal';    -- unchanged
UPDATE prescribed_drugs SET route = 'Altul'          WHERE route = 'Other';
GO

ALTER TABLE prescribed_drugs ADD CONSTRAINT CK_prescribed_drugs_route
    CHECK (route IN (
        'Oral', 'IV', 'IM', 'Subcutanat', 'Topic',
        'Inhalator', 'Sublingual', 'Rectal', 'Nazal',
        'Oftalmic', 'Transdermal', 'Altul'
    ));
GO

-- =============================================================================
-- 7. lab_ai_insights.urgency
-- =============================================================================
ALTER TABLE lab_ai_insights DROP CONSTRAINT CK_lab_ai_insights_urgency;
GO

UPDATE lab_ai_insights SET urgency = 'Normal'            WHERE urgency = 'Normal';         -- unchanged
UPDATE lab_ai_insights SET urgency = 'Monitorizare'      WHERE urgency = 'Monitor';
UPDATE lab_ai_insights SET urgency = 'Consultați medicul' WHERE urgency = 'Consult Doctor';
UPDATE lab_ai_insights SET urgency = 'Urgent'            WHERE urgency = 'Urgent';         -- unchanged
GO

ALTER TABLE lab_ai_insights ADD CONSTRAINT CK_lab_ai_insights_urgency
    CHECK (urgency IN ('Normal', 'Monitorizare', 'Consultați medicul', 'Urgent'));
GO

-- =============================================================================
-- 8. appointment_requests.type
-- =============================================================================
ALTER TABLE appointment_requests DROP CONSTRAINT CK_appointment_requests_type;
GO

UPDATE appointment_requests SET type = 'Consultație generală'  WHERE type = 'General Consultation';
UPDATE appointment_requests SET type = 'Urmărire'              WHERE type = 'Follow-up';
UPDATE appointment_requests SET type = 'Revizuire analize'     WHERE type = 'Lab Review';
UPDATE appointment_requests SET type = 'Urgență'               WHERE type = 'Emergency';
UPDATE appointment_requests SET type = 'Telemedicină'          WHERE type = 'Telemedicine';
UPDATE appointment_requests SET type = 'Trimitere specialist'  WHERE type = 'Specialist Referral';
UPDATE appointment_requests SET type = 'Control anual'         WHERE type = 'Annual Check-up';
GO

ALTER TABLE appointment_requests ADD CONSTRAINT CK_appointment_requests_type
    CHECK (type IN (
        'Consultație generală', 'Urmărire', 'Revizuire analize', 'Urgență',
        'Telemedicină', 'Trimitere specialist', 'Control anual'
    ));
GO

-- =============================================================================
-- 9. appointment_requests.status: 'Pending' / 'Approved' / 'Rejected'
-- =============================================================================
ALTER TABLE appointment_requests DROP CONSTRAINT CK_appointment_requests_status;
GO

UPDATE appointment_requests SET status = 'În așteptare' WHERE status = 'Pending';
UPDATE appointment_requests SET status = 'Aprobat'      WHERE status = 'Approved';
UPDATE appointment_requests SET status = 'Respins'      WHERE status = 'Rejected';
GO

ALTER TABLE appointment_requests
    ALTER COLUMN status NVARCHAR(50) NOT NULL;
GO

ALTER TABLE appointment_requests ADD CONSTRAINT CK_appointment_requests_status
    CHECK (status IN ('În așteptare', 'Aprobat', 'Respins'));
GO

-- =============================================================================
-- 10. appointments.status: 'Scheduled' / 'Completed' / 'Cancelled'
-- =============================================================================
ALTER TABLE appointments DROP CONSTRAINT CK_appointments_status;
GO

UPDATE appointments SET status = 'Programat' WHERE status = 'Scheduled';
UPDATE appointments SET status = 'Finalizat' WHERE status = 'Completed';
UPDATE appointments SET status = 'Anulat'    WHERE status = 'Cancelled';
GO

ALTER TABLE appointments ADD CONSTRAINT CK_appointments_status
    CHECK (status IN ('Programat', 'Finalizat', 'Anulat'));
GO

-- Update DEFAULT for new appointments
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS DF__appointme__statu__XXXXXXXX;
GO
-- (If the default constraint has a system-generated name, find it with:
--  SELECT name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('appointments') AND COL_NAME(parent_object_id, parent_column_id) = 'status')
-- Then drop it and re-add:
DECLARE @defName NVARCHAR(200);
SELECT @defName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('appointments') AND c.name = 'status';

IF @defName IS NOT NULL
    EXEC('ALTER TABLE appointments DROP CONSTRAINT ' + @defName);
GO

ALTER TABLE appointments ADD DEFAULT 'Programat' FOR status;
GO

-- =============================================================================
-- 11. doctors.specialty (no CHECK constraint, just data update)
-- =============================================================================
UPDATE doctors SET specialty = 'Cardiologie'          WHERE specialty = 'Cardiology';
UPDATE doctors SET specialty = 'Patologie clinică'    WHERE specialty = 'Clinical Pathology';
UPDATE doctors SET specialty = 'Dermatologie'         WHERE specialty = 'Dermatology';
UPDATE doctors SET specialty = 'Medicină de urgență'  WHERE specialty = 'Emergency Medicine';
UPDATE doctors SET specialty = 'Endocrinologie'       WHERE specialty = 'Endocrinology';
UPDATE doctors SET specialty = 'Medicină de familie'  WHERE specialty = 'Family Medicine';
UPDATE doctors SET specialty = 'Gastroenterologie'    WHERE specialty = 'Gastroenterology';
UPDATE doctors SET specialty = 'Chirurgie generală'   WHERE specialty = 'General Surgery';
UPDATE doctors SET specialty = 'Hematologie'          WHERE specialty = 'Hematology';
UPDATE doctors SET specialty = 'Medicină internă'     WHERE specialty = 'Internal Medicine';
UPDATE doctors SET specialty = 'Medicină de laborator' WHERE specialty = 'Laboratory Medicine';
UPDATE doctors SET specialty = 'Microbiologie'        WHERE specialty = 'Microbiology';
UPDATE doctors SET specialty = 'Nefrologie'           WHERE specialty = 'Nephrology';
UPDATE doctors SET specialty = 'Neurologie'           WHERE specialty = 'Neurology';
UPDATE doctors SET specialty = 'Oncologie'            WHERE specialty = 'Oncology';
UPDATE doctors SET specialty = 'Ortopedie'            WHERE specialty = 'Orthopedics';
UPDATE doctors SET specialty = 'Pediatrie'            WHERE specialty = 'Pediatrics';
UPDATE doctors SET specialty = 'Psihiatrie'           WHERE specialty = 'Psychiatry';
UPDATE doctors SET specialty = 'Pneumologie'          WHERE specialty = 'Pulmonology';
UPDATE doctors SET specialty = 'Radiologie'           WHERE specialty = 'Radiology';
UPDATE doctors SET specialty = 'Urologie'             WHERE specialty = 'Urology';
UPDATE doctors SET specialty = 'Altul'                WHERE specialty = 'Other';
GO

-- Also update user_profiles.specialty if populated
UPDATE user_profiles SET specialty = 'Cardiologie'          WHERE specialty = 'Cardiology';
UPDATE user_profiles SET specialty = 'Patologie clinică'    WHERE specialty = 'Clinical Pathology';
UPDATE user_profiles SET specialty = 'Dermatologie'         WHERE specialty = 'Dermatology';
UPDATE user_profiles SET specialty = 'Medicină de urgență'  WHERE specialty = 'Emergency Medicine';
UPDATE user_profiles SET specialty = 'Endocrinologie'       WHERE specialty = 'Endocrinology';
UPDATE user_profiles SET specialty = 'Medicină de familie'  WHERE specialty = 'Family Medicine';
UPDATE user_profiles SET specialty = 'Gastroenterologie'    WHERE specialty = 'Gastroenterology';
UPDATE user_profiles SET specialty = 'Chirurgie generală'   WHERE specialty = 'General Surgery';
UPDATE user_profiles SET specialty = 'Hematologie'          WHERE specialty = 'Hematology';
UPDATE user_profiles SET specialty = 'Medicină internă'     WHERE specialty = 'Internal Medicine';
UPDATE user_profiles SET specialty = 'Medicină de laborator' WHERE specialty = 'Laboratory Medicine';
UPDATE user_profiles SET specialty = 'Microbiologie'        WHERE specialty = 'Microbiology';
UPDATE user_profiles SET specialty = 'Nefrologie'           WHERE specialty = 'Nephrology';
UPDATE user_profiles SET specialty = 'Neurologie'           WHERE specialty = 'Neurology';
UPDATE user_profiles SET specialty = 'Oncologie'            WHERE specialty = 'Oncology';
UPDATE user_profiles SET specialty = 'Ortopedie'            WHERE specialty = 'Orthopedics';
UPDATE user_profiles SET specialty = 'Pediatrie'            WHERE specialty = 'Pediatrics';
UPDATE user_profiles SET specialty = 'Psihiatrie'           WHERE specialty = 'Psychiatry';
UPDATE user_profiles SET specialty = 'Pneumologie'          WHERE specialty = 'Pulmonology';
UPDATE user_profiles SET specialty = 'Radiologie'           WHERE specialty = 'Radiology';
UPDATE user_profiles SET specialty = 'Urologie'             WHERE specialty = 'Urology';
UPDATE user_profiles SET specialty = 'Altul'                WHERE specialty = 'Other';
GO

-- =============================================================================
-- 12. appointments.type (free text, no CHECK — just data update)
-- =============================================================================
UPDATE appointments SET type = 'Consultație generală' WHERE type = 'General Consultation';
UPDATE appointments SET type = 'Urmărire'             WHERE type = 'Follow-up';
UPDATE appointments SET type = 'Revizuire analize'    WHERE type = 'Lab Review';
UPDATE appointments SET type = 'Control anual'        WHERE type = 'Annual Check-up';
UPDATE appointments SET type = 'Telemedicină'         WHERE type = 'Telemedicine';
UPDATE appointments SET type = 'Urgență'              WHERE type = 'Emergency';
UPDATE appointments SET type = 'Trimitere specialist' WHERE type = 'Specialist Referral';
UPDATE appointments SET type = 'Procedură'            WHERE type = 'Procedure';
UPDATE appointments SET type = 'Vaccinare'            WHERE type = 'Vaccination';
UPDATE appointments SET type = 'Reînnoire rețetă'    WHERE type = 'Prescription Renewal';
GO

-- =============================================================================
-- 13. lab_requests.status: 'Pending' / 'In Progress' / 'Completed'
-- =============================================================================
ALTER TABLE lab_requests DROP CONSTRAINT CK_lab_requests_status;
GO

UPDATE lab_requests SET status = 'În așteptare' WHERE status = 'Pending';
UPDATE lab_requests SET status = 'În procesare' WHERE status = 'In Progress';
UPDATE lab_requests SET status = 'Finalizat'    WHERE status = 'Completed';
GO

ALTER TABLE lab_requests ADD CONSTRAINT CK_lab_requests_status
    CHECK (status IN ('În așteptare', 'În procesare', 'Finalizat'));
GO

-- Update DEFAULT for new lab requests
DECLARE @lrDefName NVARCHAR(200);
SELECT @lrDefName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('lab_requests') AND c.name = 'status';

IF @lrDefName IS NOT NULL
    EXEC('ALTER TABLE lab_requests DROP CONSTRAINT ' + @lrDefName);
GO

ALTER TABLE lab_requests ADD DEFAULT 'În așteptare' FOR status;
GO

PRINT 'Migration 006 completed: all enum values translated to Romanian.';
GO
