# Lab Doctor Dashboard - Verification & Testing Guide

## Changes Summary

### Backend Endpoints Added/Modified

1. **NEW: GET `/api/dashboard/lab-doctor/stats`** [Authorize(Roles = "lab_doctor")]
   - Response: `{ totalLabResults: int, uploadedToday: int, patientsWithLabWork: int, upcomingHarvests: int }`
   - File: [DashboardController.cs](backend/MedKit.Api/API/Controllers/DashboardController.cs)

2. **MODIFIED: GET `/api/appointments`** [Authorize(Roles = "admin,specialist_doctor,lab_doctor")]
   - Added `lab_doctor` role support
   - Lab doctors see ALL appointments (not filtered by doctor)
   - File: [AppointmentController.cs](backend/MedKit.Api/API/Controllers/AppointmentController.cs)

### Frontend Store Methods Added

**File**: [store.ts](frontend/src/lib/store.ts)

New Methods:

- `fetchAllAppointments()` - Fetches appointments from API
- `fetchLabDoctorStats()` - Fetches lab-specific dashboard stats
- `updateAppointmentStatusAsync()` - Updates status and syncs to store

New State:

- `labDoctorStats` - Cached lab doctor stats object

### Frontend Component Updates

**File**: [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx)

- Replaced `dashboardAppts` component state with store appointments
- Updated to fetch lab doctor stats from API instead of calculating locally
- Changed appointment status update handler to use async store method
- Removed direct API calls, now uses store methods

## Testing Steps

### 1. Build & Deploy

```bash
# Frontend
cd frontend
npm run build
# Check for TS errors - should complete without errors

# Backend
# Ensure project compiles
dotnet build backend/MedKit.sln
```

### 2. Database Verification

Run this query to verify test data:

```sql
-- Check lab results
SELECT TOP 10
    lr.Id,
    p.FullName as PatientName,
    lr.OriginalFileName,
    lr.UploadedAt,
    u.Name as UploaderName
FROM LabResults lr
JOIN Patients p ON lr.PatientId = p.Id
JOIN Users u ON lr.UploadedByUserId = u.Id
ORDER BY lr.UploadedAt DESC;

-- Check appointments
SELECT TOP 20
    a.Id,
    p.FullName as PatientName,
    d.Name as DoctorName,
    a.AppointmentDate,
    a.AppointmentTime,
    a.Status,
    a.Type
FROM Appointments a
JOIN Patients p ON a.PatientId = p.Id
JOIN Doctors d ON a.DoctorId = d.Id
ORDER BY a.AppointmentDate DESC;

-- Count unique patients with lab work
SELECT COUNT(DISTINCT PatientId) as PatientsWithLabWork
FROM LabResults;

-- Today's uploads (adjust date as needed)
SELECT COUNT(*) as TodayUploads
FROM LabResults
WHERE CAST(UploadedAt AS DATE) = CAST(GETDATE() AS DATE);
```

### 3. API Endpoint Testing

Use Postman or similar tool. Headers:

```
Authorization: Bearer <lab_doctor_token>
Content-Type: application/json
```

#### Test 3.1: Lab Doctor Stats Endpoint

```
GET /api/dashboard/lab-doctor/stats
Expected: 200 OK
Response:
{
  "totalLabResults": <number>,
  "uploadedToday": <number>,
  "patientsWithLabWork": <number>,
  "upcomingHarvests": <number>
}
```

#### Test 3.2: Appointments Endpoint (Lab Doctor)

```
GET /api/appointments
Expected: 200 OK
Response: [
  {
    "id": "guid",
    "patientId": "guid",
    "patientName": "Patient Name",
    "doctorId": "guid",
    "doctor": "Doctor Name",
    "date": "yyyy-MM-dd",
    "time": "HH:mm",
    "type": "ConsultationTypes",
    "status": "Scheduled|Completed|Cancelled",
    "notes": "string"
  },
  ...
]
```

#### Test 3.3: Update Appointment Status

```
PATCH /api/appointments/{appointmentId}/status
Body: { "status": "Completed" }
Expected: 200 OK
Response: { "message": "Statusul a fost actualizat." }
```

### 4. Frontend UI Testing

#### Test 4.1: Lab Doctor Login & Dashboard Load

1. Login as a lab_doctor user
2. Dashboard page should load
3. Verify API calls in browser DevTools:
   - `GET /api/patients/my`
   - `GET /api/lab-results`
   - `GET /api/dashboard/lab-doctor/stats`
   - `GET /api/appointments`

#### Test 4.2: KPI Cards Display

1. Tab: Overview
2. Verify 4 KPI cards showing:
   - Total lab results (from API)
   - Uploaded today (from API)
   - Patients with analysis (from API)
   - Upcoming harvests (from API)
3. Values should match database query results

#### Test 4.3: Recent Uploads Card

1. Should display 6 most recent lab results
2. Each entry shows:
   - File name
   - Patient name (clickable)
   - Upload date
3. Clicking patient should navigate to patient detail

#### Test 4.4: Upcoming Harvests Card

1. Should display all appointments with status "Programat"
2. Each entry shows:
   - Date block (Today/Tomorrow/Date)
   - Patient name
   - Appointment time
3. Clicking entry should navigate to patient detail

#### Test 4.5: Appointment Status Update

1. Navigate to Appointments tab
2. Find an upcoming appointment
3. Change status using dropdown
4. Verify in browser DevTools:
   - PATCH request sent to `/api/appointments/{id}/status`
   - Status shows as "Completed"
5. Refresh page
6. Status should persist (from database/store)

### 5. Data Consistency Checks

#### Test 5.1: Real-time Sync

1. Open dashboard in browser
2. In another terminal/app, upload a lab result directly
3. Dashboard should show updated stats after next refresh
4. Manual refresh (F5) should sync immediately

#### Test 5.2: Status Persistence

1. Change appointment status in dashboard
2. Close and reopen browser
3. Login again as lab_doctor
4. Dashboard should show updated status
5. Query database: verify status change persists

#### Test 5.3: Store Persistence

1. Open developer console in browser
2. Change to Application tab → Local Storage
3. Look for key `clinic-store` (Zustand persist)
4. Verify it contains `labDoctorStats` and appointments
5. Close browser, reopen
6. Data should restore from localStorage

### 6. Error Scenarios

#### Test 6.1: Missing Lab Results

1. As admin, delete all lab results from database
2. Lab doctor refreshes dashboard
3. Verify:
   - KPI shows 0
   - "No lab files" message appears
   - No errors in console

#### Test 6.2: No Upcoming Appointments

1. As admin, change all appointments to "Finalizat" or past dates
2. Lab doctor refreshes dashboard
3. Verify:
   - "No upcoming harvests" message appears
   - Upcoming harvests count = 0

#### Test 6.3: Insufficient Permissions

1. Try accessing `/api/dashboard/lab-doctor/stats` as specialist_doctor
2. Should get 403 Forbidden
3. Try as patient - should get 403 Forbidden

#### Test 6.4: Network Failure

1. Simulate network error (browser DevTools Network → Offline)
2. Refresh dashboard
3. Verify graceful handling:
   - Old data remains visible
   - Error logged to console (not shown to user)
   - App still usable

### 7. Performance Checks

#### Test 7.1: API Response Time

- All endpoints should respond < 500ms
- Check Network tab in DevTools for:
  - `/api/dashboard/lab-doctor/stats`
  - `/api/lab-results`
  - `/api/appointments`

#### Test 7.2: Dashboard Load Time

- Page should fully load in < 2 seconds
- No console errors or warnings

#### Test 7.3: Large Dataset Handling

If database has many lab results:

- Dashboard should still load quickly
- KPI calculations should be fast
- Should show 6 most recent (not all)

## Rollback Plan

If issues arise:

1. **Revert Backend**:
   - Remove `GetLabDoctorStatsAsync()` method from DashboardService
   - Remove `GetLabDoctorStats()` endpoint from DashboardController
   - Remove lab_doctor role from AppointmentController

2. **Revert Frontend**:
   - Restore `dashboardAppts` component state
   - Remove lab doctor fetch methods from store
   - Revert DashboardPage useEffect to original

3. **Verify**:
   - Lab doctors would still see appointments (if not reverted that part)
   - Dashboard would calculate stats locally

## Sign-Off Checklist

- [ ] All backend changes compile without errors
- [ ] All frontend changes compile without TypeScript errors
- [ ] Lab doctor login works
- [ ] Dashboard KPI values match database
- [ ] Status updates sync to database
- [ ] Data persists after refresh
- [ ] No console errors or warnings
- [ ] Responsive design works on mobile
- [ ] All API endpoints return correct role-based responses
- [ ] Performance acceptable (< 2s load time)

## Notes for Future Improvements

1. Add polling/WebSocket for real-time updates without refresh
2. Implement export functionality (CSV) for lab results
3. Add filtering by date range for lab results
4. Add search functionality for patient names
5. Implement pagination for large result sets
6. Add audit logging for status changes by lab doctor
