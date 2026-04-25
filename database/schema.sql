-- =============================================================================
-- MedKit Database Schema
-- Target:  SQL Server 2016+ (FOR JSON AUTO requires 2016+)
-- Run in:  SQL Server Management Studio against the MedKitDB database
--
-- Usage:
--   1. In SSMS, create a new database: CREATE DATABASE MedKitDB;
--   2. Select MedKitDB, open this file, and execute (F5).
--
-- What this script creates:
--   - 16 tables covering all roles: admin, specialist_doctor, lab_doctor, patient
--   - All primary keys, foreign keys, unique constraints, and CHECK constraints
--   - Indexes optimised for the most common query patterns
--   - 14 AFTER INSERT/UPDATE/DELETE triggers that write every data change to
--     the audit_logs table automatically
--   - Notes on how the backend should write LOGIN / LOGOUT / VIEW audit events
-- =============================================================================

-- Uncomment the two lines below if you want this script to also create the DB:
-- CREATE DATABASE MedKitDB;
-- GO

USE MedKitDB;
GO

-- =============================================================================
-- SECTION 1: TABLES
-- Created in dependency order so every FK can be declared inline.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. departments
--    Master list of hospital departments.
--    Created before doctors so doctors can FK into it.
-- -----------------------------------------------------------------------------
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
GO

-- -----------------------------------------------------------------------------
-- 1. doctors
--    Profiles for specialist and lab doctors.
--    Created before users so users can FK into it.
-- -----------------------------------------------------------------------------
CREATE TABLE doctors (
    id             UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    name           NVARCHAR(255)     NOT NULL,
    email          NVARCHAR(255)     NOT NULL,
    specialty      NVARCHAR(255)     NOT NULL,
    license_number NVARCHAR(100)     NOT NULL,
    department     NVARCHAR(255)     NULL,
    department_id  UNIQUEIDENTIFIER  NULL,
    phone          NVARCHAR(50)      NOT NULL,
    doctor_role    NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_doctors_doctor_role
            CHECK (doctor_role IN ('specialist_doctor', 'lab_doctor')),
    created_at     DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at     DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_doctors                   PRIMARY KEY (id),
    CONSTRAINT UQ_doctors_email             UNIQUE (email),
    CONSTRAINT UQ_doctors_license_number    UNIQUE (license_number),
    CONSTRAINT FK_doctors_department        FOREIGN KEY (department_id)
        REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX IX_doctors_doctor_role  ON doctors (doctor_role);
CREATE INDEX IX_doctors_specialty    ON doctors (specialty);
CREATE INDEX IX_doctors_department_id ON doctors (department_id);
GO

-- -----------------------------------------------------------------------------
-- 2. patients
--    Patient demographics. Created before users so users can FK into it.
--    allergies and current_medications are stored as plain comma-separated text
--    matching the frontend display pattern; normalise to join tables in v2.
-- -----------------------------------------------------------------------------
CREATE TABLE patients (
    id                  UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    full_name           NVARCHAR(255)     NOT NULL,
    date_of_birth       DATE              NOT NULL,
    sex                 NVARCHAR(10)      NOT NULL
        CONSTRAINT CK_patients_sex
            CHECK (sex IN ('Male', 'Female', 'Other')),
    national_id         NVARCHAR(100)     NOT NULL,
    phone               NVARCHAR(50)      NOT NULL,
    email               NVARCHAR(255)     NOT NULL,
    blood_type          NVARCHAR(10)      NOT NULL
        CONSTRAINT CK_patients_blood_type
            CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
    allergies             NVARCHAR(MAX)     NULL,
    current_medications   NVARCHAR(MAX)     NULL,
    created_by_doctor_id  UNIQUEIDENTIFIER  NULL,
    created_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_patients              PRIMARY KEY (id),
    CONSTRAINT UQ_patients_national_id  UNIQUE (national_id),
    CONSTRAINT UQ_patients_email        UNIQUE (email),
    CONSTRAINT FK_patients_created_by_doctor FOREIGN KEY (created_by_doctor_id)
        REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE INDEX IX_patients_full_name ON patients (full_name);
GO

-- -----------------------------------------------------------------------------
-- 3. users
--    Authentication identity. Each user has exactly one role.
--    doctor_id is set for specialist_doctor and lab_doctor users.
--    patient_id is set for patient-role users.
--    Admin users leave both NULL.
--    password_hash stores a bcrypt hash — never plaintext.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    email         NVARCHAR(255)     NOT NULL,
    password_hash NVARCHAR(255)     NOT NULL,
    name          NVARCHAR(255)     NOT NULL,
    role          NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_users_role
            CHECK (role IN ('specialist_doctor', 'lab_doctor', 'admin', 'patient')),
    is_active             BIT               NOT NULL DEFAULT 1,
    must_change_password  BIT               NOT NULL DEFAULT 0,
    doctor_id             UNIQUEIDENTIFIER  NULL,
    patient_id            UNIQUEIDENTIFIER  NULL,
    created_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_users             PRIMARY KEY (id),
    CONSTRAINT UQ_users_email       UNIQUE (email),
    CONSTRAINT FK_users_doctor      FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)  ON DELETE SET NULL,
    CONSTRAINT FK_users_patient     FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE SET NULL
);

CREATE INDEX IX_users_role       ON users (role);
CREATE INDEX IX_users_doctor_id  ON users (doctor_id);
CREATE INDEX IX_users_patient_id ON users (patient_id);
GO

-- -----------------------------------------------------------------------------
-- 3b. user_profiles
--     Extended profile data for all users (1-to-1 with users).
--     Admin users store their custom fields here; doctors share specialty/dept
--     with their doctors row but may override display values here.
-- -----------------------------------------------------------------------------
CREATE TABLE user_profiles (
    user_id          UNIQUEIDENTIFIER  NOT NULL,
    phone            NVARCHAR(50)      NULL,
    specialty        NVARCHAR(255)     NULL,
    license_number   NVARCHAR(100)     NULL,
    department       NVARCHAR(255)     NULL,
    hospital         NVARCHAR(255)     NULL,
    location         NVARCHAR(255)     NULL,
    bio              NVARCHAR(MAX)     NULL,
    years_experience NVARCHAR(10)      NULL,
    languages        NVARCHAR(500)     NULL,
    last_login_at    DATETIMEOFFSET(7) NULL,
    updated_at       DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_user_profiles      PRIMARY KEY (user_id),
    CONSTRAINT FK_user_profiles_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);
GO

-- -----------------------------------------------------------------------------
-- 3c. notification_rules
--     Admin-defined notification rules, each targeting a specific audience.
-- -----------------------------------------------------------------------------
CREATE TABLE notification_rules (
    id               UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
    title            NVARCHAR(255)     NOT NULL,
    description      NVARCHAR(MAX)     NULL,
    target_audience  NVARCHAR(50)      NOT NULL, -- 'patients', 'doctors', 'admins', 'all'
    is_active        BIT               NOT NULL  DEFAULT 1,
    created_by       UNIQUEIDENTIFIER  NOT NULL,
    created_at       DATETIMEOFFSET(7) NOT NULL  DEFAULT SYSDATETIMEOFFSET(),
    updated_at       DATETIMEOFFSET(7) NOT NULL  DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_notification_rules      PRIMARY KEY (id),
    CONSTRAINT FK_notification_rules_user FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE NO ACTION
);
GO

-- -----------------------------------------------------------------------------
-- 4. medical_records
--    One row per patient visit. Append-only in clinical practice:
--    corrections go through the audit log or a new amendment record.
--    secondary_diagnoses is stored as a comma-separated string matching
--    the frontend pattern.
-- -----------------------------------------------------------------------------
CREATE TABLE medical_records (
    id                  UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id          UNIQUEIDENTIFIER  NOT NULL,
    doctor_id           UNIQUEIDENTIFIER  NOT NULL,
    visit_date          DATE              NOT NULL,
    visit_type          NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_medical_records_visit_type
            CHECK (visit_type IN ('In-person', 'Telemedicine', 'Emergency', 'Follow-up', 'Procedure')),
    chief_complaint     NVARCHAR(MAX)     NOT NULL,
    diagnosis           NVARCHAR(MAX)     NOT NULL,
    icd_code            NVARCHAR(50)      NULL,
    secondary_diagnoses NVARCHAR(MAX)     NULL,
    symptoms            NVARCHAR(MAX)     NOT NULL,
    physical_exam       NVARCHAR(MAX)     NULL,
    treatment           NVARCHAR(MAX)     NOT NULL,
    procedures          NVARCHAR(MAX)     NULL,
    urgency             NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_medical_records_urgency
            CHECK (urgency IN ('Routine', 'Semi-urgent', 'Urgent', 'Emergency')),
    -- Human-readable follow-up interval: "2 weeks", "1 month", "48 hours"
    follow_up_in        NVARCHAR(100)     NULL,
    follow_up_type      NVARCHAR(100)     NULL
        CONSTRAINT CK_medical_records_follow_up_type
            CHECK (follow_up_type IS NULL OR follow_up_type IN (
                'Office visit', 'Phone call', 'Lab work', 'Imaging',
                'Specialist referral', 'ER if symptoms worsen', 'None'
            )),
    referral            NVARCHAR(MAX)     NULL,
    patient_education   NVARCHAR(MAX)     NULL,
    created_at          DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_medical_records           PRIMARY KEY (id),
    CONSTRAINT FK_medical_records_patient   FOREIGN KEY (patient_id)
        REFERENCES patients(id),
    CONSTRAINT FK_medical_records_doctor    FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
);

CREATE INDEX IX_medical_records_patient_id         ON medical_records (patient_id);
CREATE INDEX IX_medical_records_doctor_id          ON medical_records (doctor_id);
CREATE INDEX IX_medical_records_visit_date         ON medical_records (visit_date);
CREATE INDEX IX_medical_records_patient_visit_date ON medical_records (patient_id, visit_date);
CREATE INDEX IX_medical_records_icd_code           ON medical_records (icd_code);
CREATE INDEX IX_medical_records_urgency            ON medical_records (urgency);
GO

-- -----------------------------------------------------------------------------
-- 5. vital_signs
--    One row per medical record (UNIQUE constraint enforces 1-to-1).
--    Text columns store display strings as entered in the frontend
--    ("120/80", "37.0°C", "98%"). Numeric shadow columns are populated
--    by the API layer for trend queries and charting.
-- -----------------------------------------------------------------------------
CREATE TABLE vital_signs (
    id                  UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    medical_record_id   UNIQUEIDENTIFIER  NOT NULL,
    blood_pressure      NVARCHAR(50)      NULL,   -- display: "120/80"
    heart_rate          NVARCHAR(50)      NULL,   -- display: "72 bpm"
    temperature         NVARCHAR(50)      NULL,   -- display: "37.0°C"
    respiratory_rate    NVARCHAR(50)      NULL,   -- display: "16/min"
    oxygen_saturation   NVARCHAR(50)      NULL,   -- display: "98%"
    weight              NVARCHAR(50)      NULL,   -- display: "75 kg"
    height              NVARCHAR(50)      NULL,   -- display: "175 cm"
    -- Numeric shadow columns for trend analysis; set by API when parsing text
    systolic_bp         INT               NULL,
    diastolic_bp        INT               NULL,
    heart_rate_bpm      INT               NULL,
    temperature_celsius DECIMAL(4,1)      NULL,
    weight_kg           DECIMAL(6,2)      NULL,
    height_cm           DECIMAL(5,1)      NULL,
    recorded_at         DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_vital_signs                   PRIMARY KEY (id),
    CONSTRAINT UQ_vital_signs_medical_record    UNIQUE (medical_record_id),
    CONSTRAINT FK_vital_signs_medical_record    FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE CASCADE
);
GO

-- -----------------------------------------------------------------------------
-- 6. prescribed_drugs
--    N drugs per medical record visit.
--    frequency stored as free text to accommodate all 15 TypeScript enum values
--    without a long CHECK constraint.
-- -----------------------------------------------------------------------------
CREATE TABLE prescribed_drugs (
    id                      UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    medical_record_id       UNIQUEIDENTIFIER  NOT NULL,
    prescribed_by_doctor_id UNIQUEIDENTIFIER  NOT NULL,
    name                    NVARCHAR(255)     NOT NULL,
    generic_name            NVARCHAR(255)     NULL,
    dose                    NVARCHAR(100)     NOT NULL,
    route                   NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_prescribed_drugs_route
            CHECK (route IN (
                'Oral', 'IV', 'IM', 'Subcutaneous', 'Topical',
                'Inhalation', 'Sublingual', 'Rectal', 'Nasal',
                'Ophthalmic', 'Transdermal', 'Other'
            )),
    frequency               NVARCHAR(100)     NOT NULL,
    duration                NVARCHAR(100)     NOT NULL,
    quantity                NVARCHAR(100)     NULL,
    refills                 NVARCHAR(100)     NULL,
    instructions            NVARCHAR(MAX)     NULL,
    indication              NVARCHAR(MAX)     NULL,
    start_date              DATE              NULL,
    end_date                DATE              NULL,
    created_at              DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_prescribed_drugs                  PRIMARY KEY (id),
    CONSTRAINT FK_prescribed_drugs_medical_record   FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE CASCADE,
    CONSTRAINT FK_prescribed_drugs_doctor           FOREIGN KEY (prescribed_by_doctor_id)
        REFERENCES doctors(id)
);

CREATE INDEX IX_prescribed_drugs_medical_record_id ON prescribed_drugs (medical_record_id);
CREATE INDEX IX_prescribed_drugs_name              ON prescribed_drugs (name);
CREATE INDEX IX_prescribed_drugs_dates             ON prescribed_drugs (start_date, end_date);
GO

-- -----------------------------------------------------------------------------
-- 7. attachments
--    File attachments linked to a medical record.
--    url stores the object-storage path (S3 key / blob URL), not base64.
--    The API serves pre-signed download URLs; it never exposes the raw path.
-- -----------------------------------------------------------------------------
CREATE TABLE attachments (
    id                UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    medical_record_id UNIQUEIDENTIFIER  NOT NULL,
    name              NVARCHAR(255)     NOT NULL,
    mime_type         NVARCHAR(100)     NOT NULL,
    url               NVARCHAR(MAX)     NOT NULL,
    size_bytes        INT               NOT NULL,
    uploaded_at       DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_attachments                   PRIMARY KEY (id),
    CONSTRAINT FK_attachments_medical_record    FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE CASCADE
);

CREATE INDEX IX_attachments_medical_record_id ON attachments (medical_record_id);
GO

-- -----------------------------------------------------------------------------
-- 8. lab_results
--    Lab report files uploaded by lab_doctor (PDF/JPEG/PNG).
--    The actual file is stored on the backend file system; blob_name holds
--    the full disk path. No structured test fields — the file is the record.
-- -----------------------------------------------------------------------------
CREATE TABLE lab_results (
    id                   UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id           UNIQUEIDENTIFIER  NOT NULL,
    uploaded_by_user_id  UNIQUEIDENTIFIER  NOT NULL,
    original_file_name   NVARCHAR(500)     NOT NULL,
    blob_name            NVARCHAR(1000)    NOT NULL,
    content_type         NVARCHAR(100)     NOT NULL,
    file_size_bytes      BIGINT            NOT NULL,
    uploaded_at          DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_lab_results          PRIMARY KEY (id),
    CONSTRAINT FK_lab_results_patient  FOREIGN KEY (patient_id)
        REFERENCES patients(id)
);

CREATE INDEX IX_lab_results_patient_id ON lab_results (patient_id);
CREATE INDEX IX_lab_results_uploaded_at ON lab_results (uploaded_at);
GO

-- -----------------------------------------------------------------------------
-- 9. lab_ai_insights
--    AI-generated analysis for a single lab result (1-to-1).
--    findings and recommendations are JSON arrays stored as NVARCHAR(MAX),
--    e.g. '["Finding one", "Finding two"]'.
--    model_version records which AI model version produced the insight.
-- -----------------------------------------------------------------------------
CREATE TABLE lab_ai_insights (
    id              UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    lab_result_id   UNIQUEIDENTIFIER  NOT NULL,
    patient_id      UNIQUEIDENTIFIER  NOT NULL,   -- denormalised for direct patient queries
    generated_at    DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    summary         NVARCHAR(MAX)     NOT NULL,
    findings        NVARCHAR(MAX)     NOT NULL,   -- JSON array: ["finding1","finding2"]
    recommendations NVARCHAR(MAX)     NOT NULL,   -- JSON array
    urgency         NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_lab_ai_insights_urgency
            CHECK (urgency IN ('Normal', 'Monitor', 'Consult Doctor', 'Urgent')),
    disclaimer      NVARCHAR(MAX)     NOT NULL,
    model_version   NVARCHAR(100)     NULL,
    CONSTRAINT PK_lab_ai_insights               PRIMARY KEY (id),
    CONSTRAINT UQ_lab_ai_insights_lab_result    UNIQUE (lab_result_id),
    CONSTRAINT FK_lab_ai_insights_lab_result    FOREIGN KEY (lab_result_id)
        REFERENCES lab_results(id) ON DELETE CASCADE,
    CONSTRAINT FK_lab_ai_insights_patient       FOREIGN KEY (patient_id)
        REFERENCES patients(id)
);

CREATE INDEX IX_lab_ai_insights_patient_id  ON lab_ai_insights (patient_id);
CREATE INDEX IX_lab_ai_insights_generated_at ON lab_ai_insights (generated_at);
GO

-- -----------------------------------------------------------------------------
-- 10. notes
--     Free-text clinical notes authored by a doctor for a specific patient.
-- -----------------------------------------------------------------------------
CREATE TABLE notes (
    id         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id UNIQUEIDENTIFIER  NOT NULL,
    author_id  UNIQUEIDENTIFIER  NOT NULL,
    note_date  DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    content    NVARCHAR(MAX)     NOT NULL,
    created_at DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_notes         PRIMARY KEY (id),
    CONSTRAINT FK_notes_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT FK_notes_author  FOREIGN KEY (author_id)  REFERENCES doctors(id)
);

CREATE INDEX IX_notes_patient_id        ON notes (patient_id);
CREATE INDEX IX_notes_author_id         ON notes (author_id);
CREATE INDEX IX_notes_note_date         ON notes (note_date);
CREATE INDEX IX_notes_patient_note_date ON notes (patient_id, note_date);
GO

-- -----------------------------------------------------------------------------
-- 11. appointment_requests
--     Requests submitted by patients through the patient portal.
--     State machine: Pending → Approved | Rejected
--     When Approved, a corresponding row is created in appointments and
--     appointments.appointment_request_id is set back to this row's id.
-- -----------------------------------------------------------------------------
CREATE TABLE appointment_requests (
    id                  UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id          UNIQUEIDENTIFIER  NOT NULL,
    requested_date      DATE              NOT NULL,
    requested_time      NVARCHAR(20)      NOT NULL,   -- "10:00 AM"
    type                NVARCHAR(100)     NOT NULL
        CONSTRAINT CK_appointment_requests_type
            CHECK (type IN (
                'General Consultation', 'Follow-up', 'Lab Review', 'Emergency',
                'Telemedicine', 'Specialist Referral', 'Annual Check-up'
            )),
    reason              NVARCHAR(MAX)     NOT NULL,
    preferred_doctor_id UNIQUEIDENTIFIER  NULL,
    status              NVARCHAR(50)      NOT NULL DEFAULT 'Pending'
        CONSTRAINT CK_appointment_requests_status
            CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    response_note       NVARCHAR(MAX)     NULL,
    responded_by_id     UNIQUEIDENTIFIER  NULL,
    responded_at        DATETIMEOFFSET(7) NULL,
    created_at          DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at          DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_appointment_requests                  PRIMARY KEY (id),
    CONSTRAINT FK_appointment_requests_patient          FOREIGN KEY (patient_id)
        REFERENCES patients(id),
    CONSTRAINT FK_appointment_requests_pref_doctor      FOREIGN KEY (preferred_doctor_id)
        REFERENCES doctors(id) ON DELETE SET NULL,
    CONSTRAINT FK_appointment_requests_responded_by     FOREIGN KEY (responded_by_id)
        REFERENCES users(id)
);

CREATE INDEX IX_appointment_requests_patient_id     ON appointment_requests (patient_id);
CREATE INDEX IX_appointment_requests_status         ON appointment_requests (status);
CREATE INDEX IX_appointment_requests_requested_date ON appointment_requests (requested_date);
GO

-- -----------------------------------------------------------------------------
-- 12. appointments
--     Staff-created scheduled appointments (distinct from patient requests).
--     appointment_request_id links back to the request that prompted this slot;
--     it is NULL for appointments created directly by staff without a request.
--     type stored as free text to match frontend values without a long CHECK.
-- -----------------------------------------------------------------------------
CREATE TABLE appointments (
    id                     UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id             UNIQUEIDENTIFIER  NOT NULL,
    doctor_id              UNIQUEIDENTIFIER  NOT NULL,
    appointment_date       DATE              NOT NULL,
    appointment_time       NVARCHAR(20)      NOT NULL,   -- "09:00", "14:30"
    type                   NVARCHAR(100)     NOT NULL,
    notes                  NVARCHAR(MAX)     NULL,
    status                 NVARCHAR(50)      NOT NULL DEFAULT 'Scheduled'
        CONSTRAINT CK_appointments_status
            CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
    appointment_request_id UNIQUEIDENTIFIER  NULL,
    created_at             DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at             DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_appointments              PRIMARY KEY (id),
    CONSTRAINT FK_appointments_patient      FOREIGN KEY (patient_id)
        REFERENCES patients(id),
    CONSTRAINT FK_appointments_doctor       FOREIGN KEY (doctor_id)
        REFERENCES doctors(id),
    CONSTRAINT FK_appointments_request      FOREIGN KEY (appointment_request_id)
        REFERENCES appointment_requests(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX UQ_appointments_request    ON appointments (appointment_request_id) WHERE appointment_request_id IS NOT NULL;
CREATE INDEX IX_appointments_patient_id       ON appointments (patient_id);
CREATE INDEX IX_appointments_doctor_id        ON appointments (doctor_id);
CREATE INDEX IX_appointments_appointment_date ON appointments (appointment_date);
CREATE INDEX IX_appointments_status           ON appointments (status);
CREATE INDEX IX_appointments_patient_date     ON appointments (patient_id, appointment_date);
GO

-- -----------------------------------------------------------------------------
-- 13. consultation_reminders
--     Reminder items shown in the patient portal.
--     dismissed = 1 once the patient has acknowledged the reminder.
-- -----------------------------------------------------------------------------
CREATE TABLE consultation_reminders (
    id         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id UNIQUEIDENTIFIER  NOT NULL,
    type       NVARCHAR(50)      NOT NULL
        CONSTRAINT CK_consultation_reminders_type
            CHECK (type IN (
                'follow-up-due', 'annual-checkup', 'lab-result-ready',
                'medication-refill', 'specialist-referral'
            )),
    title      NVARCHAR(255)     NOT NULL,
    message    NVARCHAR(MAX)     NOT NULL,
    due_date   DATE              NOT NULL,
    priority   NVARCHAR(20)      NOT NULL
        CONSTRAINT CK_consultation_reminders_priority
            CHECK (priority IN ('low', 'medium', 'high')),
    dismissed  BIT               NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_consultation_reminders            PRIMARY KEY (id),
    CONSTRAINT FK_consultation_reminders_patient    FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IX_consultation_reminders_patient_id         ON consultation_reminders (patient_id);
CREATE INDEX IX_consultation_reminders_patient_dismissed  ON consultation_reminders (patient_id, dismissed);
CREATE INDEX IX_consultation_reminders_due_date           ON consultation_reminders (due_date);
CREATE INDEX IX_consultation_reminders_priority           ON consultation_reminders (priority);
GO

-- -----------------------------------------------------------------------------
-- 14. chat_sessions
--     AI chatbot sessions. patient_id is NULL when a doctor queries the
--     assistant without selecting a specific patient context.
-- -----------------------------------------------------------------------------
CREATE TABLE chat_sessions (
    id                   UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    patient_id           UNIQUEIDENTIFIER  NULL,
    initiated_by_user_id UNIQUEIDENTIFIER  NULL,
    created_at           DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at           DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_chat_sessions             PRIMARY KEY (id),
    CONSTRAINT FK_chat_sessions_patient     FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE SET NULL,
    CONSTRAINT FK_chat_sessions_user        FOREIGN KEY (initiated_by_user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IX_chat_sessions_patient_id           ON chat_sessions (patient_id);
CREATE INDEX IX_chat_sessions_initiated_by_user_id ON chat_sessions (initiated_by_user_id);
CREATE INDEX IX_chat_sessions_created_at           ON chat_sessions (created_at);
GO

-- -----------------------------------------------------------------------------
-- 15. chat_messages
--     Individual messages within a chat session. Stored as normalized rows
--     (not a JSONB blob in chat_sessions) to enable pagination and per-message
--     search without parsing JSON.
-- -----------------------------------------------------------------------------
CREATE TABLE chat_messages (
    id         UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    session_id UNIQUEIDENTIFIER  NOT NULL,
    role       NVARCHAR(20)      NOT NULL
        CONSTRAINT CK_chat_messages_role
            CHECK (role IN ('user', 'assistant')),
    content    NVARCHAR(MAX)     NOT NULL,
    timestamp  DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_chat_messages             PRIMARY KEY (id),
    CONSTRAINT FK_chat_messages_session     FOREIGN KEY (session_id)
        REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IX_chat_messages_session_id        ON chat_messages (session_id);
CREATE INDEX IX_chat_messages_session_timestamp ON chat_messages (session_id, timestamp);
GO

-- -----------------------------------------------------------------------------
-- 16. audit_logs
--     Append-only log of every data change in the system.
--
--     Populated by:
--       - DML triggers (INSERT/UPDATE/DELETE) on all tables below
--       - The API layer directly (LOGIN, LOGOUT, VIEW events)
--
--     old_values / new_values contain a JSON serialisation of the full row
--     before and after the change:
--       INSERT  → old_values = NULL,  new_values = {new row}
--       UPDATE  → old_values = {old row}, new_values = {new row}
--       DELETE  → old_values = {deleted row}, new_values = NULL
--       LOGIN / LOGOUT / VIEW → both NULL; context in metadata
--
--     performed_by_user_id is read from SESSION_CONTEXT(N'app_user_id'),
--     which the backend sets at the start of every request:
--       EXEC sp_set_session_context N'app_user_id', @userId, @read_only = 0;
--
--     IMPORTANT: Never UPDATE or DELETE rows in this table.
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id                   UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    performed_by_user_id UNIQUEIDENTIFIER  NULL,
    action               NVARCHAR(20)      NOT NULL
        CONSTRAINT CK_audit_logs_action
            CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW')),
    entity_type          NVARCHAR(100)     NOT NULL,   -- table name: 'patients', 'medical_records'
    entity_id            UNIQUEIDENTIFIER  NULL,
    old_values           NVARCHAR(MAX)     NULL,       -- JSON row snapshot before change
    new_values           NVARCHAR(MAX)     NULL,       -- JSON row snapshot after change
    ip_address           NVARCHAR(50)      NULL,
    user_agent           NVARCHAR(MAX)     NULL,
    metadata             NVARCHAR(MAX)     NULL,       -- extra context: page, filters, session id
    performed_at         DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (id)
    -- No FK on performed_by_user_id: audit rows are historical records and must
    -- survive user deletion. The INSTEAD OF triggers below require no cascades.
);

CREATE INDEX IX_audit_logs_performed_by_user_id ON audit_logs (performed_by_user_id);
CREATE INDEX IX_audit_logs_entity               ON audit_logs (entity_type, entity_id);
CREATE INDEX IX_audit_logs_performed_at         ON audit_logs (performed_at);
CREATE INDEX IX_audit_logs_action               ON audit_logs (action);
CREATE INDEX IX_audit_logs_entity_action_date   ON audit_logs (entity_type, action, performed_at);
GO

-- INSTEAD OF triggers block DELETE and UPDATE on audit_logs for ALL users,
-- including sysadmin connections from SSMS. DENY alone would not stop sysadmin.
IF OBJECT_ID('trg_protect_audit_logs_delete', 'TR') IS NOT NULL DROP TRIGGER trg_protect_audit_logs_delete;
GO
CREATE TRIGGER trg_protect_audit_logs_delete
ON audit_logs
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR('audit_logs rows are immutable and cannot be deleted.', 16, 1);
    ROLLBACK;
END;
GO

IF OBJECT_ID('trg_protect_audit_logs_update', 'TR') IS NOT NULL DROP TRIGGER trg_protect_audit_logs_update;
GO
CREATE TRIGGER trg_protect_audit_logs_update
ON audit_logs
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR('audit_logs rows are immutable and cannot be updated.', 16, 1);
    ROLLBACK;
END;
GO


-- =============================================================================
-- SECTION 2: AUDIT TRIGGERS
--
-- One AFTER INSERT, UPDATE, DELETE trigger per table.
--
-- Trigger logic (same pattern for every table):
--   1. Determine whether this is an INSERT, UPDATE, or DELETE by checking which
--      of the INSERTED / DELETED pseudo-tables contain rows.
--   2. Read the current application user from SESSION_CONTEXT(N'app_user_id').
--      The backend sets this at request start; it is NULL for unauthenticated
--      or system-initiated changes.
--   3. For INSERTs and UPDATEs, iterate rows in INSERTED (new data) and
--      capture the old row from DELETED when action is UPDATE.
--   4. For DELETEs, iterate rows in DELETED.
--   5. Serialize each row to JSON with FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER.
--
-- password_hash is excluded from the users trigger to avoid logging credentials.
-- chat_messages and audit_logs have no trigger (chat history is not individually
-- audited; audit_logs is insert-only by design).
-- =============================================================================

-- ─── departments ─────────────────────────────────────────────────────────────
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

-- ─── doctors ────────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_doctors', 'TR') IS NOT NULL DROP TRIGGER trg_audit_doctors;
GO
CREATE TRIGGER trg_audit_doctors
ON doctors
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
            'doctors',
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
            @performed_by, 'DELETE', 'doctors', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── patients ────────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_patients', 'TR') IS NOT NULL DROP TRIGGER trg_audit_patients;
GO
CREATE TRIGGER trg_audit_patients
ON patients
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
            'patients',
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
            @performed_by, 'DELETE', 'patients', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── users (password_hash excluded from audit to prevent credential logging) ─
IF OBJECT_ID('trg_audit_users', 'TR') IS NOT NULL DROP TRIGGER trg_audit_users;
GO
CREATE TRIGGER trg_audit_users
ON users
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
            'users',
            i.id,
            CASE WHEN @action = 'UPDATE'
                 THEN (SELECT TOP 1 id, email, name, role, is_active, doctor_id, patient_id, created_at, updated_at
                       FROM deleted WHERE id = i.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER)
                 ELSE NULL
            END,
            (SELECT TOP 1 id, email, name, role, is_active, doctor_id, patient_id, created_at, updated_at
             FROM inserted WHERE id = i.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER)
        FROM inserted i;
    ELSE
        INSERT INTO audit_logs (performed_by_user_id, action, entity_type, entity_id, old_values, new_values)
        SELECT
            @performed_by, 'DELETE', 'users', d.id,
            (SELECT TOP 1 id, email, name, role, is_active, doctor_id, patient_id, created_at, updated_at
             FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── medical_records ─────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_medical_records', 'TR') IS NOT NULL DROP TRIGGER trg_audit_medical_records;
GO
CREATE TRIGGER trg_audit_medical_records
ON medical_records
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
            'medical_records',
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
            @performed_by, 'DELETE', 'medical_records', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── vital_signs ─────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_vital_signs', 'TR') IS NOT NULL DROP TRIGGER trg_audit_vital_signs;
GO
CREATE TRIGGER trg_audit_vital_signs
ON vital_signs
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
            'vital_signs',
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
            @performed_by, 'DELETE', 'vital_signs', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── prescribed_drugs ────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_prescribed_drugs', 'TR') IS NOT NULL DROP TRIGGER trg_audit_prescribed_drugs;
GO
CREATE TRIGGER trg_audit_prescribed_drugs
ON prescribed_drugs
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
            'prescribed_drugs',
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
            @performed_by, 'DELETE', 'prescribed_drugs', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── attachments ─────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_attachments', 'TR') IS NOT NULL DROP TRIGGER trg_audit_attachments;
GO
CREATE TRIGGER trg_audit_attachments
ON attachments
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
            'attachments',
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
            @performed_by, 'DELETE', 'attachments', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── lab_results ─────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_lab_results', 'TR') IS NOT NULL DROP TRIGGER trg_audit_lab_results;
GO
CREATE TRIGGER trg_audit_lab_results
ON lab_results
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
            'lab_results',
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
            @performed_by, 'DELETE', 'lab_results', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── lab_ai_insights ─────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_lab_ai_insights', 'TR') IS NOT NULL DROP TRIGGER trg_audit_lab_ai_insights;
GO
CREATE TRIGGER trg_audit_lab_ai_insights
ON lab_ai_insights
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
            'lab_ai_insights',
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
            @performed_by, 'DELETE', 'lab_ai_insights', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── notes ───────────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_notes', 'TR') IS NOT NULL DROP TRIGGER trg_audit_notes;
GO
CREATE TRIGGER trg_audit_notes
ON notes
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
            'notes',
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
            @performed_by, 'DELETE', 'notes', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── appointments ────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_appointments', 'TR') IS NOT NULL DROP TRIGGER trg_audit_appointments;
GO
CREATE TRIGGER trg_audit_appointments
ON appointments
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
            'appointments',
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
            @performed_by, 'DELETE', 'appointments', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── appointment_requests ─────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_appointment_requests', 'TR') IS NOT NULL DROP TRIGGER trg_audit_appointment_requests;
GO
CREATE TRIGGER trg_audit_appointment_requests
ON appointment_requests
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
            'appointment_requests',
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
            @performed_by, 'DELETE', 'appointment_requests', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── consultation_reminders ───────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_consultation_reminders', 'TR') IS NOT NULL DROP TRIGGER trg_audit_consultation_reminders;
GO
CREATE TRIGGER trg_audit_consultation_reminders
ON consultation_reminders
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
            'consultation_reminders',
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
            @performed_by, 'DELETE', 'consultation_reminders', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO

-- ─── chat_sessions ────────────────────────────────────────────────────────────
IF OBJECT_ID('trg_audit_chat_sessions', 'TR') IS NOT NULL DROP TRIGGER trg_audit_chat_sessions;
GO
CREATE TRIGGER trg_audit_chat_sessions
ON chat_sessions
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
            'chat_sessions',
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
            @performed_by, 'DELETE', 'chat_sessions', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO


-- =============================================================================
-- SECTION 3: APPLICATION-LEVEL AUDIT EVENTS
--
-- LOGIN, LOGOUT, and VIEW events cannot be captured by DML triggers because
-- they are not data mutations. The API layer must write them directly:
--
-- LOGIN (write after a successful password check):
--   INSERT INTO audit_logs
--       (performed_by_user_id, action, entity_type, entity_id,
--        ip_address, user_agent, metadata)
--   VALUES
--       (@userId, 'LOGIN', 'users', @userId,
--        @ipAddress, @userAgent, '{"outcome":"success"}');
--
-- LOGOUT:
--   INSERT INTO audit_logs
--       (performed_by_user_id, action, entity_type, entity_id)
--   VALUES
--       (@userId, 'LOGOUT', 'users', @userId);
--
-- VIEW (sensitive record access — patient file, lab result, etc.):
--   INSERT INTO audit_logs
--       (performed_by_user_id, action, entity_type, entity_id, metadata)
--   VALUES
--       (@userId, 'VIEW', 'patients', @patientId,
--        '{"page":"PatientDetailPage"}');
--
-- SESSION CONTEXT (must be set at the start of every request before any DML,
-- so all triggered audit rows carry the correct user identity):
--   EXEC sp_set_session_context N'app_user_id', @userId, @read_only = 0;
-- =============================================================================


-- =============================================================================
-- SECTION 4: VERIFICATION QUERIES
-- Uncomment and run block-by-block after executing this script to verify setup.
-- =============================================================================

/*
-- 4.1  Confirm all 16 tables were created
SELECT TABLE_NAME
FROM   INFORMATION_SCHEMA.TABLES
WHERE  TABLE_TYPE = 'BASE TABLE'
ORDER  BY TABLE_NAME;
-- Expected: 16 rows

-- 4.2  Confirm all 14 triggers were created
SELECT t.name          AS trigger_name,
       OBJECT_NAME(t.parent_id) AS table_name
FROM   sys.triggers t
WHERE  t.name LIKE 'trg_audit_%'
ORDER  BY t.name;
-- Expected: 14 rows

-- 4.3  Test INSERT audit on patients
INSERT INTO patients (full_name, date_of_birth, sex, national_id, phone, email, blood_type)
VALUES (N'Audit Test Patient', '1990-06-15', 'Female', 'TEST-AUDIT-001',
        '0700000000', 'audit.test@example.com', 'O+');

SELECT action, entity_type, new_values, performed_at
FROM   audit_logs
WHERE  entity_type = 'patients'
ORDER  BY performed_at DESC;
-- Expected: one INSERT row; new_values contains the patient JSON

-- 4.4  Test UPDATE audit
UPDATE patients SET phone = '0711111111' WHERE national_id = 'TEST-AUDIT-001';

SELECT action, entity_type, old_values, new_values, performed_at
FROM   audit_logs
WHERE  entity_type = 'patients'
ORDER  BY performed_at DESC;
-- Expected: one UPDATE row; old_values has original phone, new_values has new phone

-- 4.5  Test DELETE audit
DELETE FROM patients WHERE national_id = 'TEST-AUDIT-001';

SELECT action, entity_type, old_values, new_values, performed_at
FROM   audit_logs
WHERE  entity_type = 'patients'
ORDER  BY performed_at DESC;
-- Expected: one DELETE row; old_values has the deleted row, new_values is NULL

-- 4.6  Confirm audit_logs is protected against modification
-- Try to delete a row — the INSTEAD OF trigger should raise an error:
-- DELETE FROM audit_logs WHERE 1=1;
-- Expected: "audit_logs rows are immutable and cannot be deleted."
*/
