# AI Insights — Documentație de setup și arhitectură

> Acest document acoperă tot ce s-a implementat și tot ce mai rămâne de făcut pentru sistemul AI Insights din MedKit. Brief-ul complet de specificație se află în [`docs/AI_INSIGHTS_BRIEF.md`](AI_INSIGHTS_BRIEF.md).

---

## Cuprins

1. [Prezentare generală](#1-prezentare-generală)
2. [Arhitectura proiectelor](#2-arhitectura-proiectelor)
3. [Ce s-a implementat (Faza 0 → 3)](#3-ce-sa-implementat-faza-0--3)
4. [Setup — pași obligatorii înainte de pornire](#4-setup--pași-obligatorii-înainte-de-pornire)
5. [Configurare](#5-configurare)
6. [Rulare teste](#6-rulare-teste)
7. [Roadmap — Faze rămase (4–6)](#7-roadmap--faze-rămase-4-6)
8. [Reguli de siguranță AI](#8-reguli-de-siguranță-ai)
9. [Note LLM și hardware](#9-note-llm-și-hardware)

---

## 1. Prezentare generală

Sistemul AI Insights adaugă patru capabilități noi pe platforma MedKit:

| # | Capabilitate | Tip | Status |
|---|---|---|---|
| 1 | Analiză automată PDF rezultate laborator | AI + reguli | ✅ Implementat (Faza 2) |
| 2 | Reminder follow-up consultație | Deterministic (fără AI) | ✅ Implementat (Faza 3) |
| 3 | Endpoint-uri API pentru insights + chat | REST API | ⏳ Faza 4 (neimplementat) |
| 4 | Sumarizare istoric medical + Chat AI | AI cu tool-calling | ⏳ Faza 5 (neimplementat) |

**Render dual:** fiecare insight AI produce două variante din același LLM call — una pentru **doctor** (limbaj clinic, abrevieri medicale) și una pentru **pacient** (limbaj simplu, fără jargon). Frontend-ul alege varianta pe baza rolului utilizatorului.

**Kill-switch global:** `AiInsights:EnableAiFeatures = false` dezactivează complet înregistrarea serviciilor AI în DI. Când e `false`, nicio rută AI nu e expusă și niciun job Hangfire AI nu pornește. `FollowUpReminderJob` și `PendingLabScanner` se înregistrează **indiferent** de flag.

---

## 2. Arhitectura proiectelor

```
MedKit.AiInsights/          ← class library pură (fără DB, fără HttpContext)
  Abstractions/             ← ILlmClient, IPdfTextExtractor
  Llm/                      ← OpenAiCompatibleLlmClient, LlmRequestBuilder
  PdfProcessing/            ← PdfPigTextExtractor, TesseractOcrFallback
  Prompts/                  ← LabInsightPrompt.v1.txt, LabParsePrompt.v1.txt (embedded resources)
  Models/                   ← LlmModels, AiInsightsOptions, LabInsightModels
  Safety/                   ← OutputValidator, ForbiddenPatterns
  Generators/               ← LabInsightGenerator
                               (Faza 5) HistorySummaryGenerator, ChatAgent
  Tools/                    ← (Faza 5) PatientDataTools (tool definitions pentru agent)
  tessdata/                 ← ron.traineddata + eng.traineddata (descărcate manual, .gitignore)

MedKit.Api/                 ← proiect existent, referențiază MedKit.AiInsights
  Models/Entities/          ← 4 entități noi: LabAiInsightEntity, ConsultationReminderEntity,
                               ChatSessionEntity, ChatMessageEntity
                               + LabResultEntity modificat (coloane AI processing)
  Models/AppDbContext.cs    ← 4 DbSet-uri noi + OnModelCreating config
  API/Helpers/              ← FollowUpIntervalParser
  Services/                 ← ConsultationReminderService (+ MedicalRecordService modificat)
  API/Controllers/          ← ConsultationReminderController
                               (Faza 4) AiInsightsController, ChatController

MedKit.AiWorker/            ← worker service (Hangfire host)
  Jobs/                     ← LabAnalysisJob, FollowUpReminderJob, PendingLabScanner

MedKit.AiInsights.Tests/    ← xUnit, referențiază MedKit.AiInsights
  Mocks/                    ← FakeLlmClient
  Llm/                      ← LlmRequestBuilderTests, FakeLlmClientTests
  PdfProcessing/            ← PdfPigTextExtractorTests
  Safety/                   ← OutputValidatorTests
```

**Grafic dependențe (fără referințe circulare):**

```
MedKit.AiInsights
    ↑ referenced by
MedKit.Api          MedKit.AiInsights.Tests
    ↑ referenced by
MedKit.AiWorker
```

`MedKit.AiInsights` nu cunoaște `AppDbContext` și nu face acces la DB. Persistența e responsabilitatea `MedKit.AiWorker` și `MedKit.Api`.

---

## 3. Ce s-a implementat (Faza 0 → 3)

### Faza 0 — Setup

| Fișier | Descriere |
|---|---|
| `database/migrations/010_add_ai_insights_columns.sql` | Adaugă coloane AI pe `lab_results` și `lab_ai_insights`; index filtrat pe status |
| `backend/MedKit.Api/Models/Entities/LabAiInsightEntity.cs` | Mapează tabela `lab_ai_insights` (inclusiv coloanele noi din migrare) |
| `backend/MedKit.Api/Models/Entities/ConsultationReminderEntity.cs` | Mapează `consultation_reminders` |
| `backend/MedKit.Api/Models/Entities/ChatSessionEntity.cs` | Mapează `chat_sessions` |
| `backend/MedKit.Api/Models/Entities/ChatMessageEntity.cs` | Mapează `chat_messages` |
| `backend/MedKit.Api/Models/Entities/LabResultEntity.cs` | **Modificat** — adaugă 4 câmpuri AI processing |
| `backend/MedKit.Api/Models/AppDbContext.cs` | **Modificat** — 4 DbSet-uri noi + relații EF |
| `backend/MedKit.Api/appsettings.json` | **Modificat** — secțiunea `AiInsights` |
| `backend/MedKit.Api/appsettings.Development.json` | **Modificat** — endpoint localhost pentru dev |
| `backend/MedKit.Api/MedKit.Api.csproj` | **Modificat** — project reference la MedKit.AiInsights |
| `backend/MedKit.AiInsights/MedKit.AiInsights.csproj` | Proiect nou cu PdfPig, Tesseract, Polly |
| `backend/MedKit.AiWorker/MedKit.AiWorker.csproj` | Proiect nou cu Hangfire |
| `backend/MedKit.AiInsights.Tests/MedKit.AiInsights.Tests.csproj` | Proiect nou xUnit |

### Faza 1 — Foundations

| Fișier | Descriere |
|---|---|
| `MedKit.AiInsights/Abstractions/ILlmClient.cs` | Interfață pentru clientul LLM |
| `MedKit.AiInsights/Abstractions/IPdfTextExtractor.cs` | Interfață pentru extracția text din PDF |
| `MedKit.AiInsights/Models/AiInsightsOptions.cs` | Opțiuni strongly-typed (`AiInsights:*` din config) |
| `MedKit.AiInsights/Models/LlmModels.cs` | Modele C# pentru request/response LLM |
| `MedKit.AiInsights/Models/LabInsightModels.cs` | `PatientContext`, `ParsedLabTest`, `LabInsightRaw`, `InsightVariant`, `LabInsightResult` |
| `MedKit.AiInsights/Llm/LlmRequestBuilder.cs` | Builder fluent pentru `LlmRequest` |
| `MedKit.AiInsights/Llm/OpenAiCompatibleLlmClient.cs` | Client HTTP pentru API compatibil OpenAI + logging latență |
| `MedKit.AiInsights/PdfProcessing/PdfPigTextExtractor.cs` | Extracție text PDF; fallback OCR dacă text < 50 caractere |
| `MedKit.AiInsights/PdfProcessing/TesseractOcrFallback.cs` | OCR pentru PDF-uri scanate (necesită `tessdata/`) |
| `MedKit.AiInsights/Prompts/LabInsightPrompt.v1.txt` | Prompt sistem v1 pentru generare insight dual (embedded resource) |
| `MedKit.AiInsights/Prompts/LabParsePrompt.v1.txt` | Prompt v1 pentru parsare structurată teste laborator (embedded resource) |
| `MedKit.AiInsights.Tests/Mocks/FakeLlmClient.cs` | Implementare fake `ILlmClient` pentru teste |
| `MedKit.AiInsights.Tests/Llm/LlmRequestBuilderTests.cs` | 4 teste builder |
| `MedKit.AiInsights.Tests/Llm/FakeLlmClientTests.cs` | 4 teste FakeLlmClient |
| `MedKit.AiInsights.Tests/PdfProcessing/PdfPigTextExtractorTests.cs` | 4 teste extractor PDF |
| `MedKit.AiInsights.Tests/Safety/OutputValidatorTests.cs` | Teste OutputValidator |
| `backend/MedKit.Api/Program.cs` | **Modificat** — DI registration condiționat (`EnableAiFeatures`) |

**Retry + circuit breaker (configurat în `Program.cs` pentru ambele proiecte — Api și AiWorker):**
- Retry: 3 încercări, backoff exponențial (`2^attempt` secunde: 2s → 4s → 8s)
- Circuit breaker: deschide după 5 eșecuri consecutive, resetare după 30s

### Faza 2 — Lab Insights

| Fișier | Descriere |
|---|---|
| `MedKit.AiInsights/Safety/ForbiddenPatterns.cs` | 3 regex-uri compilate: diagnostic explicit, doze, contrazicere tratament |
| `MedKit.AiInsights/Safety/OutputValidator.cs` | Validare completă: urgency enum, lungimi min/max summary, findings prezente, regex safety |
| `MedKit.AiInsights/Generators/LabInsightGenerator.cs` | Orchestrare 2-stage LLM: LLM call #1 parsare → rules engine trend → LLM call #2 dual insight |
| `MedKit.AiWorker/Jobs/PendingLabScanner.cs` | Recurring job (la fiecare minut) — scanează `lab_results` cu `ai_processing_status = 'pending'` și enqueue-ează `LabAnalysisJob` |
| `MedKit.AiWorker/Jobs/LabAnalysisJob.cs` | Flow complet: extrage PDF → construiește `PatientContext` → generator → validator → INSERT `lab_ai_insights` → reminder dacă Urgent/Consult Doctor → marchează completed/failed |
| `MedKit.AiWorker/Program.cs` | **Configurat** — Hangfire SQL Server, 2 worker threads, recurring jobs înregistrate |

**Detalii tehnice `LabInsightGenerator`:**
- LLM call #1: `LabParsePrompt.v1.txt` + `response_format: json_object` → `List<ParsedLabTest>` cu `{testName, value, unit, referenceRange, isOutOfRange}`
- Rules engine: `EnrichTrendFromHistory` compară fiecare test cu rezultate anterioare → câmp `TrendVsPrevious` (`increasing/decreasing/stable`)
- LLM call #2: `LabInsightPrompt.v1.txt` + context complet (vârstă, sex, alergii, medicamente, teste parsate cu trend, text brut PDF trunchiat la 3000 chars) → `LabInsightRaw` cu `Doctor` + `Patient` variants + `Urgency`
- Urgency enum: `Normal | Monitor | Consult Doctor | Urgent`

**Detalii tehnice `LabAnalysisJob`:**
- `PatientContext`: vârstă calculată din `DateOfBirth`, sex, alergii, medicamente din `patient.CurrentMedications` (split pe `\n`, `,`, `;`)
- Fișier PDF: rezolvat din `lab_result.BlobName` relativ la `FileStorage:BasePath` din config
- Status transitions: `pending → processing → completed | failed`
- `ai_processing_error` trunchiată la 500 chars

**Hangfire schedule:**
```
scan-pending-lab-results  →  Cron.Minutely()       (la fiecare minut)
follow-up-reminders       →  "0 6 * * *"            (zilnic 06:00 UTC)
```

### Faza 3 — Follow-up Reminders

| Fișier | Descriere |
|---|---|
| `MedKit.Api/API/Helpers/FollowUpIntervalParser.cs` | Parser static: regex `^(\d+)\s*(\S+)$`; normalizează unități în RO și EN (`oră/ore/hour`, `zi/zile/day`, `săptămână/week`, `lună/month`, `an/year`) |
| `MedKit.Api/Services/ConsultationReminderService.cs` | `CreateForRecordAsync` + `UpsertForRecordAsync` — apelate din `MedicalRecordService` la create/update |
| `MedKit.Api/Services/MedicalRecordService.cs` | **Modificat** — injectează `ConsultationReminderService`; creează/upsert reminder la orice modificare a câmpului `FollowUpIn` |
| `MedKit.AiWorker/Jobs/FollowUpReminderJob.cs` | Recurring job 06:00 UTC — citește toate `medical_records WHERE follow_up_in IS NOT NULL`; creează reminder de tip `follow-up-due` doar dacă `dueDate >= azi` și nu există deja un reminder activ cu același `(patientId, type, dueDate)` |
| `MedKit.Api/API/Controllers/ConsultationReminderController.cs` | `GET /api/consultation-reminders` (reminders active ale pacientului curent); `PATCH /api/consultation-reminders/{id}/dismiss` |
| `frontend/src/lib/store.ts` | **Modificat** — adăugat `consultationReminders[]`, `labAIInsights[]`, `fetchConsultationReminders()`, `fetchLabAIInsight(labResultId)` |
| `frontend/src/pages/PatientDashboardPage.tsx` | **Modificat** — afișează reminders cu icoane, countdown zile, priority badges |

---

## 4. Setup — pași obligatorii înainte de pornire

### 4.1. Rulează migrarile SQL

Deschide SSMS, conectează-te la `MedKitDB` și rulează în ordine:

```
database/migrations/010_ai_migration.sql
database/migrations/010_add_ai_insights_columns.sql
```

Migrarea adaugă:
- Pe `lab_results`: `ai_processing_status`, `ai_processing_error`, `ai_processing_started_at`, `ai_processing_completed_at`
- Pe `lab_ai_insights`: `summary_patient`, `findings_patient`, `recommendations_patient`, `prompt_version`
- Tabelele `consultation_reminders`, `chat_sessions`, `chat_messages`
- Index filtrat pe `ai_processing_status` pentru performanță pe coada de procesare

### 4.2. Creează userul de sistem AI

Generează un GUID nou (ex. în SSMS: `SELECT NEWID()`), apoi rulează în `MedKitDB`:

```sql
INSERT INTO users (id, email, password_hash, name, role, is_active)
VALUES ('<GUID-generat>', 'ai-system@medkit.internal', 'NOT_A_REAL_HASH', 'AI System', 'admin', 1);
```

Salvează GUID-ul — îl folosești la pasul următor în configurare.

### 4.3. Instalează datele Tesseract

Descarcă fișierele de limbă din repo-ul oficial Tesseract:

```
https://github.com/tesseract-ocr/tessdata
```

Fișiere necesare:
- `ron.traineddata` (română)
- `eng.traineddata` (engleză)

Plasează-le în:
```
backend/MedKit.AiInsights/tessdata/
```

La `dotnet build`, MSBuild le copiază automat în output-ul tuturor proiectelor care referențiază `MedKit.AiInsights`.

> **Notă:** Fișierele `*.traineddata` sunt în `.gitignore` — nu se commit-ează în repo.

### 4.4. Configurează secretele — MedKit.Api

```bash
cd backend/MedKit.Api

dotnet user-secrets set "AiInsights:LlmEndpoint"    "http://<llm-host>:8000/v1"
dotnet user-secrets set "AiInsights:LlmApiKey"      "<api-key>"
dotnet user-secrets set "AiInsights:AiSystemUserId" "<GUID-de-la-pasul-4.2>"
```

### 4.5. Configurează secretele — MedKit.AiWorker

```bash
cd backend/MedKit.AiWorker

dotnet user-secrets set "ConnectionStrings:MedKitDb"         "<connection-string>"
dotnet user-secrets set "AiInsights:LlmEndpoint"             "http://<llm-host>:8000/v1"
dotnet user-secrets set "AiInsights:LlmApiKey"               "<api-key>"
dotnet user-secrets set "AiInsights:AiSystemUserId"          "<GUID-de-la-pasul-4.2>"
```

> **Important:** `MedKit.AiWorker` are propriul context de configurare — secretele trebuie setate separat față de `MedKit.Api`.

---

## 5. Configurare

Secțiunea completă `AiInsights` din `appsettings.json` (identică în Api și AiWorker):

```json
"AiInsights": {
  "LlmEndpoint": "",
  "LlmApiKey": "",
  "ModelName": "meta-llama/Llama-3.3-70B-Instruct",
  "AiSystemUserId": "",
  "MaxTokensPerInsight": 2000,
  "EnableAiFeatures": false
}
```

| Câmp | Descriere |
|---|---|
| `LlmEndpoint` | URL bază vLLM/TGI/Groq (ex: `http://localhost:8000/v1`) — setat prin user-secrets |
| `LlmApiKey` | API key pentru LLM — setat prin user-secrets |
| `ModelName` | Numele modelului trimis în fiecare request LLM |
| `AiSystemUserId` | GUID-ul user-ului de sistem AI din tabelul `users` |
| `MaxTokensPerInsight` | Limita de tokeni per LLM call #2 (insight dual); call #1 folosește fix 1500 tokeni |
| `EnableAiFeatures` | **Kill-switch global** — `false` = niciun serviciu AI înregistrat în DI |

**Dev local:** `appsettings.Development.json` suprascrie `LlmEndpoint` cu serverul local (sau Groq pentru teste rapide). `FollowUpReminderJob` și `PendingLabScanner` rulează indiferent de `EnableAiFeatures`.

**Groq (alternativă gratuită pentru dev):**
```json
"LlmEndpoint": "https://api.groq.com/openai/v1",
"ModelName":   "llama-3.3-70b-versatile"
```

---

## 6. Rulare teste

```bash
cd backend
dotnet test MedKit.AiInsights.Tests/MedKit.AiInsights.Tests.csproj
```

Rezultat așteptat: toate testele Passed (Llm + PdfProcessing + Safety).

> **Notă despre testele PDF:** `PdfDocumentBuilder` din PdfPig nu generează mapare Unicode (ToUnicode CMap) când folosește fonturi Standard14, deci extracția de text din PDF-uri create programatic returnează mereu string gol. Testele verifică comportamentul corect (no throw, tip corect returnat), nu conținutul textului.

---

## 7. Roadmap — Faze rămase (4–6)

### Faza 4 — Endpoint-uri API *(neimplementat)*

#### 4a. `AiInsightsController.cs`

**Fișier:** `MedKit.Api/API/Controllers/AiInsightsController.cs`

Endpoint-uri necesare:

```
GET /api/lab-results/{id}/insights          ← insight complet sau 404 dacă nu există încă
GET /api/lab-results/{id}/processing-status ← polling: {status, error?}
```

**Logica de autorizare pentru `GET /api/lab-results/{id}/insights`:**
- Pacient → returnează doar câmpurile `*_patient` (`summary_patient`, `findings_patient`, `recommendations_patient`) + `urgency`, `disclaimer`, `generated_at`; verifică că `lab_result.patient_id == currentUser.patient_id`
- Doctor specialist → returnează ambele variante; verifică că există un `medical_record` între doctor și pacientul respectiv
- Lab doctor → returnează ambele variante; verifică că `lab_result.uploaded_by == currentUser.id`
- Admin → returnează tot; access logat în `audit_logs`

**Structura răspuns:**
```json
{
  "labResultId": "...",
  "generatedAt": "...",
  "urgency": "Monitor",
  "disclaimer": "...",
  "doctor": {
    "summary": "...",
    "findings": ["..."],
    "recommendations": ["..."]
  },
  "patient": {
    "summary": "...",
    "findings": ["..."],
    "recommendations": ["..."]
  }
}
```
Câmpul `doctor` e `null` pentru pacienți.

#### 4b. Modificare `LabResultsController.cs`

La `POST /api/lab-results` (upload rezultat), după INSERT în DB:

```csharp
// Marchează statusul pentru scanner
labResult.AiProcessingStatus = "pending";
await db.SaveChangesAsync();
```

`PendingLabScanner` va prelua fișierul în cel mult 1 minut. Alternativ, se poate face `BackgroundJob.Enqueue<LabAnalysisJob>(labResult.Id)` direct dacă `MedKit.Api` referențiază Hangfire — dar asta adaugă o dependență suplimentară; abordarea cu scanner e mai decuplată.

> **Status curent:** `LabResultsController` nu setează `ai_processing_status = 'pending'` la upload — deci `PendingLabScanner` nu preia nimic. Acesta e singurul gap rămas în Faza 2/3.

---

### Faza 5 — History Summary + Chat *(neimplementat)*

#### 5a. `HistorySummaryGenerator.cs`

**Fișier:** `MedKit.AiInsights/Generators/HistorySummaryGenerator.cs`

Agent cu tool-calling (OpenAI function calling format):

```csharp
public async Task<HistorySummaryResult> GenerateAsync(
    Guid patientId, string role, CancellationToken ct)
```

**Tool-uri definite în `MedKit.AiInsights/Tools/PatientDataTools.cs`:**

| Tool | Descriere | Parametri |
|---|---|---|
| `get_patient_profile` | Vârstă, sex, alergii, medicamente active | `patientId` |
| `get_medical_records` | Ultimele N consultații cu diagnostic și FollowUpIn | `patientId`, `limit` |
| `get_lab_results_with_insights` | Ultimele N rezultate laborator + insight generat | `patientId`, `limit` |
| `get_active_medications` | Lista medicamentelor din `current_medications` | `patientId` |

**Output:** `{chronicConditions[], recentChanges[], watchItems[]}` — dual render doctor/pacient.

**Cache:** 15 min per `(patientId, role)` — `IMemoryCache` sau `IDistributedCache`.

**Endpoint API:**
```
GET  /api/ai-insights/patient/{id}/history-summary
POST /api/ai-insights/patient/{id}/regenerate-summary  ← doar doctor
```

#### 5b. `ChatAgent.cs`

**Fișier:** `MedKit.AiInsights/Generators/ChatAgent.cs`

Agent conversațional cu același set de tool-uri ca `HistorySummaryGenerator`. Primește lista de mesaje din sesiune curentă + apelează tool-urile dacă LLM-ul solicită context suplimentar.

```csharp
public async Task<string> SendMessageAsync(
    Guid sessionId, string userMessage, CancellationToken ct)
```

**Persistență sesiune:**
- `chat_sessions`: `id`, `patient_id`, `initiated_by_user_id`, `created_at`
- `chat_messages`: `id`, `session_id`, `role` (`user|assistant`), `content`, `created_at`

#### 5c. `ChatController.cs`

**Fișier:** `MedKit.Api/API/Controllers/ChatController.cs`

```
POST /api/chat/sessions               ← creează sesiune nouă; returnează {sessionId}
POST /api/chat/sessions/{id}/messages ← trimite mesaj; returnează {content, createdAt}
GET  /api/chat/sessions/{id}/messages ← returnează istoricul [{role, content, createdAt}]
```

**Autorizare:** pacientul vede doar propriile sesiuni; doctorul nu are acces la chat.

---

### Faza 6 — Hardening *(neimplementat)*

- **LLM-as-judge complet:** call #3 pe orice output vizibil — model mai mic (ex. `llama-3.1-8b`) evaluează „Respectă regulile de siguranță? DA/NU". Dacă NU → fail, output nu se persistă.
- **Audit log integrat** pe toate operațiile AI: `model_version`, `prompt_version`, `latency_ms` salvate în `audit_logs.metadata`
- **Metrici latență:** timp pe LLM call #1, #2, #3 separat; logat ca `LogInformation` structurat cu tag-uri Hangfire
- **Rate limiting** pe endpoint-urile AI (separate de rate limiting-ul de autentificare existent)

---

## 8. Reguli de siguranță AI

Aceste verificări sunt **hardcodate** (nu doar în prompt) în `OutputValidator` + `ForbiddenPatterns` și **unit-testate**:

| # | Regulă | Regex actual (`ForbiddenPatterns.cs`) |
|---|---|---|
| 1 | Fără diagnostice explicite | `\b(aveți\|aveti\|suferiți de\|suferiti de\|diagnosticul este\|ești diagnosticat\|...)\s+\w+` |
| 2 | Fără recomandări de doze | `\b(luați\|luati\|administrați\|administrati\|luaţi)\s+\d+\s*(mg\|ml\|mcg\|g\|UI\|...)` |
| 3 | Fără contrazicere tratament | `\b(opriți\|opriti\|întrerupeți\|intrerupeti\|nu mai luați\|renunțați la\|...)\s+(tratamentul\|medicamentul\|...)` |
| 4 | Urgency valid | Enum hardcodat: `Normal \| Monitor \| Consult Doctor \| Urgent` |
| 5 | Lungime rezonabilă | Summary: min 20 / max 5000 chars; Findings: min 1 element |
| 6 | JSON valid conform schemei | Deserializare strictă `LabInsightRaw` — aruncă excepție dacă schema nu se potrivește |
| 7 | Disclaimer obligatoriu | Adăugat hardcodat de `LabAnalysisJob` (nu vine din LLM) |
| 8 | LLM-as-judge | *(Faza 6 — neimplementat)* |

Dacă oricare verificare pică → `ai_processing_status = 'failed'`, eroarea se salvează în `ai_processing_error`, output-ul **nu** se persistă în `lab_ai_insights`.

---

## 9. Note LLM și hardware

**Model recomandat:** `meta-llama/Llama-3.3-70B-Instruct`

**Alternativă dev/test:** Groq API (gratuit, limitat) cu `llama-3.3-70b-versatile` — endpoint `https://api.groq.com/openai/v1`, complet compatibil OpenAI.

**Server LLM on-premise:** vLLM sau TGI cu API compatibil OpenAI (`/v1/chat/completions`).

**Hardware pentru MVP** (<100 insights/zi):
- GPU: 24–48 GB VRAM (ex. RTX 3090/4090 sau A6000)
- Cuantizare Q4 pentru Llama 3.3 70B — încape pe un singur GPU 48GB
- Opțiune cloud: RunPod / Vast.ai (~$1/h) pentru testare, apoi on-premise

**Versionare prompturi:**
- Orice modificare de prompt → versiune nouă (ex. `v1 → v2`)
- Fișierele `.txt` sunt embedded resources în `MedKit.AiInsights` — rebuild necesar după modificare
- Versiunea se salvează în `lab_ai_insights.prompt_version` pentru reproductibilitate
- Constanta `PromptVersion` în `LabInsightGenerator.cs` trebuie actualizată manual la orice schimbare de prompt

**GDPR / EU AI Act:**
- Atâta timp cât output-ul este **informational/assistive** (sumarizare + flagging), nu diagnostic, sistemul e în zona safe conform EU AI Act.
- Adaugă consimțământ explicit la onboarding pentru procesarea AI a datelor medicale (checkbox separat de termenii generali).
- Documentează explicit limitele sistemului: nu face diagnostic, nu prescrie, nu înlocuiește medicul.
