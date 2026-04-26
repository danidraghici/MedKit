-- =============================================================================
-- Migration 004: Doctor Schedules
-- Adds doctor_schedules table for managing doctor availability and blocked slots.
-- Run against MedKitDB after schema.sql and prior migrations have been applied.
-- =============================================================================

USE MedKitDB;
GO

-- -----------------------------------------------------------------------------
-- doctor_schedules
-- Stores both weekly working hours and specific-date blocks per doctor.
-- Status = 'active': live schedule entry (set by doctor or approved by doctor)
-- Status = 'pending_approval': admin-proposed change awaiting doctor approval
-- -----------------------------------------------------------------------------
CREATE TABLE doctor_schedules (
    id                    UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    doctor_id             UNIQUEIDENTIFIER  NOT NULL,
    schedule_type         NVARCHAR(20)      NOT NULL,  -- 'working_hours' | 'block'
    day_of_week           INT               NULL,       -- 0=Sun..6=Sat, for working_hours entries
    specific_date         DATE              NULL,       -- for block entries
    start_time            NVARCHAR(5)       NULL,       -- 'HH:mm'
    end_time              NVARCHAR(5)       NULL,       -- 'HH:mm', NULL for full-day blocks
    is_working_day        BIT               NOT NULL DEFAULT 1,
    is_full_day           BIT               NOT NULL DEFAULT 0,
    reason                NVARCHAR(500)     NULL,
    status                NVARCHAR(20)      NOT NULL DEFAULT 'active',
    proposed_by_user_id   UNIQUEIDENTIFIER  NULL,
    replaces_schedule_id  UNIQUEIDENTIFIER  NULL,
    created_by_user_id    UNIQUEIDENTIFIER  NOT NULL,
    created_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at            DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT PK_doctor_schedules PRIMARY KEY (id),

    CONSTRAINT FK_doctor_schedules_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,

    CONSTRAINT FK_doctor_schedules_proposed_by
        FOREIGN KEY (proposed_by_user_id) REFERENCES users(id) ON DELETE NO ACTION,

    CONSTRAINT FK_doctor_schedules_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE NO ACTION,

    CONSTRAINT FK_doctor_schedules_replaces
        FOREIGN KEY (replaces_schedule_id) REFERENCES doctor_schedules(id) ON DELETE NO ACTION,

    CONSTRAINT CHK_ds_schedule_type
        CHECK (schedule_type IN ('working_hours', 'block')),

    CONSTRAINT CHK_ds_status
        CHECK (status IN ('active', 'pending_approval')),

    CONSTRAINT CHK_ds_day_of_week
        CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),

    CONSTRAINT CHK_ds_working_hours_needs_day
        CHECK (schedule_type <> 'working_hours' OR day_of_week IS NOT NULL),

    CONSTRAINT CHK_ds_block_needs_date
        CHECK (schedule_type <> 'block' OR specific_date IS NOT NULL)
);
GO

CREATE INDEX IX_doctor_schedules_doctor_status
    ON doctor_schedules (doctor_id, status);
GO

CREATE INDEX IX_doctor_schedules_proposed_by
    ON doctor_schedules (proposed_by_user_id);
GO
