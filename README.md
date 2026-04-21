# MedKit — Clinical Management System

A HIPAA-aware web application for clinical staff and patients, featuring multi-role authentication, patient record management, lab result tracking with AI-powered insights, appointment scheduling, and a kidney stone detection AI chatbot.

---

## Architecture

```
MedKit/
├── backend/          # ASP.NET Core 8 Web API (C#)
│   └── MedKit.Api/
├── frontend/         # React 19 SPA (TypeScript + Vite)
└── database/         # SQL Server schema and migrations
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Zustand |
| Backend | ASP.NET Core 8 Web API, EF Core 8 (SQL Server) |
| Database | SQL Server 2016+ (managed via SSMS) |
| Auth | JWT (15 min access token) + opaque refresh token (httpOnly cookie) |
| Password hashing | BCrypt.Net-Next, work factor 12 |

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full system access — manage doctors, patients, appointments |
| `specialist_doctor` | Patient records, appointments, AI chatbot |
| `lab_doctor` | Patient records and lab results |
| `patient` | Own medical history, lab results, appointment requests |

---

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- [Node.js 20+](https://nodejs.org/)
- SQL Server 2016+ (or SQL Server Express / LocalDB)
- SQL Server Management Studio (SSMS) — recommended for running scripts

---

## Database Setup

### 1. Create the database and run the schema

Open SSMS, create a new database called `MedKitDB`, then execute the schema script:

```sql
-- In SSMS: File → Open → database/schema.sql
-- Make sure "MedKitDB" is selected, then press F5
```

### 2. Add the refresh tokens table

```sql
-- Run: database/migrations/001_add_refresh_tokens.sql
```

### 3. Seed the admin user

Generate a bcrypt hash (work factor 12) for your chosen password using any online bcrypt tool, then edit `database/seed_admin.sql` — replace `<BCRYPT_HASH_HERE>` and run the script in SSMS.

---

## Backend Setup

```bash
cd backend/MedKit.Api
```

### Configure secrets (never committed to source control)

```bash
dotnet user-secrets set "ConnectionStrings:MedKitDb" \
  "Server=localhost,1433;Database=MedKitDB;User Id=sa;Password=YourPass;TrustServerCertificate=True;"

dotnet user-secrets set "Jwt:AccessSecret" "$(openssl rand -hex 48)"
```

> Generate the JWT secret with any method that produces 32+ random characters. On Windows without OpenSSL, you can run: `[System.Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))` in PowerShell.

### Run

```bash
dotnet run
# API available at http://localhost:5138
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:5138`, so no CORS configuration is needed in development.

---

## API Endpoints

All endpoints are under `/api/auth`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Liveness check |
| `POST` | `/api/auth/login` | — | Sign in — returns access token + sets httpOnly refresh cookie |
| `POST` | `/api/auth/refresh` | cookie | Silent re-auth — rotates refresh token |
| `POST` | `/api/auth/logout` | Bearer | Revokes refresh token + writes LOGOUT audit event |
| `POST` | `/api/auth/change-password` | Bearer | Validates current password, enforces strength, revokes all sessions |

### Login request

```json
POST /api/auth/login
{
  "email": "admin@medkit.com",
  "password": "YourPassword1!",
  "remember": true
}
```

### Login response

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@medkit.com",
    "name": "System Administrator",
    "role": "admin",
    "patientId": null,
    "doctorId": null
  }
}
```

### Change password request

```json
POST /api/auth/change-password
Authorization: Bearer <accessToken>
{
  "currentPassword": "OldPassword1!",
  "newPassword": "NewPassword2@"
}
```

Password requirements: minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character.

---

## Security Features

| Feature | Detail |
|---------|--------|
| Password hashing | BCrypt, work factor 12 (~250 ms per hash) |
| Access token | JWT, 15-minute expiry, `HS256` signed |
| Refresh token | 128-char random hex, SHA-256 hash stored in DB, sent as `httpOnly Secure SameSite=Strict` cookie scoped to `/api/auth` |
| Token rotation | Every `/refresh` call revokes the old token and issues a new one |
| Session revocation | Password change revokes all active refresh tokens for that user |
| Rate limiting | 5 login attempts per 15 minutes per IP (built-in ASP.NET Core rate limiter) |
| Account deactivation | `is_active = 0` in the `users` table blocks login immediately |
| Timing-safe login | BCrypt always runs — prevents email enumeration via response timing |
| Audit logging | Every LOGIN and LOGOUT event is written to the `audit_logs` table with IP address and user agent |
| Session context | `sp_set_session_context` is set inside EF Core transactions so SQL Server DML triggers automatically record the acting user ID on every data change |
| No auth in localStorage | Access token lives in Zustand memory only; `user` and `isAuthenticated` are never persisted to localStorage |

---

## Project Structure

### Backend

```
backend/MedKit.Api/
├── Controllers/
│   └── AuthController.cs       # HTTP routes and cookie management
├── Data/
│   ├── AppDbContext.cs          # EF Core DbContext
│   └── Entities/
│       ├── UserEntity.cs
│       ├── RefreshTokenEntity.cs
│       └── AuditLogEntity.cs
├── DTOs/
│   ├── LoginRequest.cs
│   ├── ChangePasswordRequest.cs
│   └── AuthUserDto.cs
├── Helpers/
│   └── SessionContextHelper.cs  # sp_set_session_context wrapper
├── Services/
│   ├── AuthService.cs           # Login, logout, change password
│   ├── TokenService.cs          # JWT + refresh token lifecycle
│   └── AuditService.cs          # Audit log writes
└── Program.cs                   # App bootstrap and DI configuration
```

### Frontend

```
frontend/src/
├── lib/
│   ├── api.ts        # Authenticated fetch client (auto-refresh on 401)
│   ├── store.ts      # Zustand store — auth slice + all app state
│   └── types.ts      # TypeScript interfaces
├── pages/
│   ├── LoginPage.tsx
│   ├── PatientLoginPage.tsx
│   └── ...
└── App.tsx           # Root component — routing, role-based rendering
```

### Database

```
database/
├── schema.sql                          # Full DB schema (run once)
├── migrations/
│   └── 001_add_refresh_tokens.sql      # Run after schema.sql
└── seed_admin.sql                      # Creates initial admin user
```

---

## Silent Re-authentication

When the app loads, it automatically attempts a token refresh using the stored httpOnly cookie. This means users who checked "Remember me" stay signed in across browser restarts without re-entering their password. The flow:

1. App mount → `initAuth()` → `POST /api/auth/refresh`
2. If the cookie is valid: new access token issued, user rehydrated in store, app renders
3. If no cookie or expired: user lands on login page

---

## Audit Trail

The database maintains a complete, immutable audit trail in the `audit_logs` table. All data mutations (INSERT / UPDATE / DELETE) on clinical tables are captured automatically via SQL Server triggers. Login, logout, and record-view events are written by the API layer. The audit log cannot be modified or deleted — enforced by INSTEAD OF triggers on the table itself.
