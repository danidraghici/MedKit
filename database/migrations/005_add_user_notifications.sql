-- =============================================================================
-- MedKit Migration 005: Add trigger_event to notification_rules + user_notifications table
-- Run in SSMS against MedKitDB before starting the backend.
-- =============================================================================

USE MedKitDB;
GO

-- Add trigger_event column to existing notification_rules table
-- Allowed values: general | schedule_change | appointment_created | appointment_updated
ALTER TABLE notification_rules
    ADD trigger_event NVARCHAR(50) NOT NULL DEFAULT 'general';
GO

-- New table: stores individual notifications delivered to users
CREATE TABLE user_notifications (
    id                    UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWID(),
    user_id               UNIQUEIDENTIFIER   NOT NULL,
    notification_rule_id  UNIQUEIDENTIFIER   NULL,
    title                 NVARCHAR(255)      NOT NULL,
    body                  NVARCHAR(MAX)      NULL,
    is_read               BIT                NOT NULL DEFAULT 0,
    related_entity_type   NVARCHAR(50)       NULL,    -- 'doctor_schedule' | 'appointment' | 'system'
    related_entity_id     UNIQUEIDENTIFIER   NULL,
    created_at            DATETIMEOFFSET(7)  NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_user_notifications PRIMARY KEY (id),
    CONSTRAINT FK_user_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_user_notifications_rule
        FOREIGN KEY (notification_rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL
);

CREATE INDEX IX_user_notifications_user   ON user_notifications(user_id);
CREATE INDEX IX_user_notifications_unread ON user_notifications(user_id, is_read);
GO
