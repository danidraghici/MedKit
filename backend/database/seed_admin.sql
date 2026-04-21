-- =============================================================================
-- MedKit Seed: Create initial admin user
--
-- Generate a bcrypt hash (work factor 12) for your chosen password using:
--   - The /api/auth/hash endpoint (run the backend first with --seed-hash flag), OR
--   - An online bcrypt generator at cost 12, OR
--   - The dotnet script: cd backend/MedKit.Api && dotnet run -- hash "YourPassword"
--
-- Replace <BCRYPT_HASH_HERE> with the result before running this script.
-- =============================================================================

USE MedKitDB;
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
BEGIN
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (
        'admin@medkit.com',
        '<BCRYPT_HASH_HERE>',   -- bcrypt hash of your chosen admin password
        'System Administrator',
        'admin',
        1
    );
    PRINT 'Admin user created: admin@medkit.com';
END
ELSE
BEGIN
    PRINT 'Admin user already exists — skipping.';
END
GO
