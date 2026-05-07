# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MedKit is a clinical management system with four user roles: `admin`, `specialist_doctor`, `lab_doctor`, and `patient`. It uses an ASP.NET Core 8 backend, React 19 frontend, and SQL Server database.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint (--max-warnings 0, no warnings allowed)
npm run lint -- --fix  # Auto-fix lint issues
```

### Backend (`backend/MedKit.Api/`)
```bash
dotnet run        # Kestrel on http://localhost:5138
dotnet build
dotnet test       # xUnit tests in MedKit.Tests/
```

### Database
Run `database/schema.sql` first, then `database/migrations/001-009_*.sql` in order via SSMS. Seed admin: `database/seed_admin.sql` (replace bcrypt hash placeholder before running).

## Architecture

### Backend (ASP.NET Core 8)

Three-layer architecture: **Controllers → Services → EF Core (AppDbContext)**. No repository layer — services call `AppDbContext` directly.

- [Controllers](backend/MedKit.Api/API/Controllers/) — 18 controllers, thin, delegates to services
- [Services](backend/MedKit.Api/Services/) — all business logic (18 services, registered as `AddScoped`)
- [Models/Entities](backend/MedKit.Api/Models/Entities/) — 21 EF Core entity classes
- [DTOs](backend/MedKit.Api/API/DTOs/) — 36 request/response shapes, never expose entities directly
- [Program.cs](backend/MedKit.Api/Program.cs) — DI registrations, middleware, CORS, rate limiting, JWT, background session-cleanup timer

### Frontend (React 19 + TypeScript)

- [App.tsx](frontend/src/App.tsx) — React Router v7 routes, role-based routing, layout wrappers
- [lib/store.ts](frontend/src/lib/store.ts) — Single Zustand store with domain slices (auth, doctors, patients, appointments, lab requests/results, medical records, notes, notifications, dashboard)
- [lib/api.ts](frontend/src/lib/api.ts) — Authenticated fetch wrapper; auto-refreshes JWT on 401 before retrying
- [lib/types.ts](frontend/src/lib/types.ts) — All shared TypeScript interfaces
- [pages/](frontend/src/pages/) — 20 pages organized by role; each page hydrates its slice via store actions on mount
- [components/](frontend/src/components/) — Reusable UI; shadcn/ui (Radix UI + Tailwind) is the component library

### Database (SQL Server)

16 tables with GUID PKs (`NEWSEQUENTIALID`). 14 AFTER triggers on clinical tables automatically write to `audit_logs`. INSTEAD OF triggers on `audit_logs` prevent deletion or updates — the audit trail is immutable.

Session context (`sp_set_session_context`) is set per request so triggers can identify the acting user without passing a parameter. This is set in `AuthService`/`AuditService` before each DB operation.

Migrations are plain `.sql` files run manually in SSMS (no EF Core migrations).

### Authentication Flow

1. `POST /api/auth/login` → bcrypt verify → issue 15-min JWT (memory-only in Zustand) + 7-day httpOnly `SameSite=Strict` refresh cookie
2. Frontend API client detects 401 → calls `POST /api/auth/refresh` → token rotated, new cookie set, request retried
3. On app load, `initAuth()` in the store calls `/api/auth/refresh` silently to restore session from cookie
4. Logout revokes the specific refresh token; password change revokes all refresh tokens for that user
5. Rate limiting: 5 login attempts per 15 min per IP

### Key Utilities

- [lib/cnp.ts](frontend/src/lib/cnp.ts) — Romanian national ID (CNP) validation used on patient registration
- [lib/icd10-ro.ts](frontend/src/lib/icd10-ro.ts) — Romanian ICD-10 disease code lookup for medical records
- [lib/aiService.ts](frontend/src/lib/aiService.ts) — AI chatbot integration (ChatbotPage)

## Configuration & Secrets

Backend secrets (never in `appsettings.json`):
```bash
dotnet user-secrets set "ConnectionStrings:MedKitDb" "<connection string>"
dotnet user-secrets set "Jwt:AccessSecret" "<32+ byte hex>"
```

Frontend: Vite proxies `/api` to `http://localhost:5138` in dev (see [vite.config.ts](frontend/vite.config.ts)), so no `VITE_API_URL` needed locally.

## Tech Stack Versions

| Layer | Key Libraries |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, React Router 7, Zustand 5, TanStack Query 5, Zod 4, Recharts 3 |
| Backend | .NET 8, ASP.NET Core 8, EF Core 8, BCrypt.Net-Next 4 (work factor 12) |
| Testing | xUnit 2.9, Moq 4.20, EF Core InMemory |
| Database | SQL Server 2016+ (LocalDB in dev) |
