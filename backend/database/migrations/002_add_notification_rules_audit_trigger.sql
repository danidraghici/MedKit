-- Migration 002: Add audit trigger for notification_rules table
-- Run this against the MedKitDB database after schema.sql has been applied.

IF OBJECT_ID('trg_audit_notification_rules', 'TR') IS NOT NULL DROP TRIGGER trg_audit_notification_rules;
GO
CREATE TRIGGER trg_audit_notification_rules
ON notification_rules
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
            'notification_rules',
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
            @performed_by, 'DELETE', 'notification_rules', d.id,
            (SELECT TOP 1 * FROM deleted WHERE id = d.id FOR JSON AUTO, WITHOUT_ARRAY_WRAPPER),
            NULL
        FROM deleted d;
END;
GO
