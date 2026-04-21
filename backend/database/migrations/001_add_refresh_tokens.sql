-- =============================================================================
-- MedKit Migration 001: Add refresh_tokens table
-- Run in SSMS against MedKitDB before starting the backend.
-- =============================================================================

USE MedKitDB;
GO

CREATE TABLE refresh_tokens (
    id          UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    user_id     UNIQUEIDENTIFIER  NOT NULL,
    token_hash  NVARCHAR(255)     NOT NULL,   -- SHA-256 hex of the raw token (never stored plain)
    expires_at  DATETIMEOFFSET(7) NOT NULL,
    created_at  DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    revoked_at  DATETIMEOFFSET(7) NULL,       -- NULL = still valid; non-NULL = revoked
    ip_address  NVARCHAR(50)      NULL,
    user_agent  NVARCHAR(MAX)     NULL,
    CONSTRAINT PK_refresh_tokens      PRIMARY KEY (id),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IX_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX IX_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IX_refresh_tokens_expires_at ON refresh_tokens (expires_at);
GO
