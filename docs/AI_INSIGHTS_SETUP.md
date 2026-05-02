# AI Insights — Documentație de setup și arhitectură

> Acest document acoperă tot ce s-a implementat și tot ce mai rămâne de făcut pentru sistemul AI Insights din MedKit. Brief-ul complet de specificație se află în [`docs/AI_INSIGHTS_BRIEF.md`](AI_INSIGHTS_BRIEF.md).

---

## Cuprins

1. [Prezentare generală](#1-prezentare-generală)
2. [Arhitectura proiectelor](#2-arhitectura-proiectelor)
3. [Ce s-a implementat (Faza 0 + Faza 1)](#3-ce-sa-implementat-faza-0--faza-1)
4. [Setup — pași obligatorii înainte de pornire](#4-setup--pași-obligatorii-înainte-de-pornire)
5. [Configurare](#5-configurare)
6. [Rulare teste](#6-rulare-teste)
7. [Roadmap — Faze rămase](#7-roadmap--faze-rămase)
8. [Reguli de siguranță AI](#8-reguli-de-siguranță-ai)
9. [Note LLM și hardware](#9-note-llm-și-hardware)

---

## 1. Prezentare generală

Sistemul AI Insights adaugă patru capabilități noi pe platforma MedKit:

| # | Capabilitate | Tip | Status |
|---|---|---|---|
| 1 | Analiză automată PDF rezultate laborator | AI + reguli | Faza 2 (neimplementat) |
| 2 | Reminder follow-up consultație | Deterministic (fără AI) | Faza 3 (neimplementat) |
| 3 | Sumarizare istoric medical (on-demand) | AI cu tool-calling | Faza 5 (neimplementat) |
| 4 | Chat AI cu context pacient | AI cu tool-calling | Faza 5 (neimplementat) |

**Render dual:** fiecare insight AI produce două variante din același LLM call — una pentru **doctor** (limbaj clinic, abrevieri medicale) și una pentru **pacient** (limbaj simplu, fără jargon). Frontend-ul alege varianta pe baza rolului utilizatorului.

**Kill-switch global:** `AiInsights:EnableAiFeatures = false` dezactivează complet înregistrarea serviciilor AI în DI. Când e `false`, nicio rută AI nu e expusă și niciun job Hangfire nu pornește.

---

## 2. Arhitectura proiectelor

```
MedKit.AiInsights/          ← class library pură (fără DB, fără HttpContext)
  Abstractions/             ← ILlmClient, IPdfTextExtractor
  Llm/                      ← OpenAiCompatibleLlmClient, LlmRequestBuilder
  PdfProcessing/            ← PdfPigTextExtractor, TesseractOcrFallback
  Prompts/                  ← LabInsightPrompt.v1.txt (embedded resource)
  Models/                   ← LlmModels, AiInsightsOptions
  Safety/                   ← (Faza 2) OutputValidator, ForbiddenPatterns
  Generators/               ← (Faza 2+5) LabInsightGenerator, HistorySummaryGenerator, ChatAgent
  Tools/                    ← (Faza 5) PatientDataTools (tool definitions pentru agent)
  tessdata/                 ← ron.traineddata + eng.traineddata (descărcate manual, .gitignore)

MedKit.Api/                 ← proiect existent, referențiază MedKit.AiInsights
  Models/Entities/          ← 4 entități noi: LabAiInsightEntity, ConsultationReminderEntity,
                               ChatSessionEntity, ChatMessageEntity
                               + LabResultEntity modificat (coloane AI processing)
  Models/AppDbContext.cs    ← 4 DbSet-uri noi + OnModelCreating config

MedKit.AiWorker/            ← worker service (Hangfire host) — schelet creat, fără logică încă
  Jobs/                     ← (Faza 2) LabAnalysisJob, (Faza 3) FollowUpReminderJob

MedKit.AiInsights.Tests/    ← xUnit, referențiază MedKit.AiInsights
  Mocks/                    ← FakeLlmClient
  Llm/                      ← LlmRequestBuilderTests, FakeLlmClientTests
  PdfProcessing/            ← PdfPigTextExtractorTests
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

## 3. Ce s-a implementat (Faza 0 + Faza 1)

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
| `backend/MedKit.AiWorker/MedKit.AiWorker.csproj` | Proiect nou cu Hangfire (schelet) |
| `backend/MedKit.AiInsights.Tests/MedKit.AiInsights.Tests.csproj` | Proiect nou xUnit |

### Faza 1 — Foundations

| Fișier | Descriere |
|---|---|
| `MedKit.AiInsights/Abstractions/ILlmClient.cs` | Interfață pentru clientul LLM |
| `MedKit.AiInsights/Abstractions/IPdfTextExtractor.cs` | Interfață pentru extracția text din PDF |
| `MedKit.AiInsights/Models/AiInsightsOptions.cs` | Opțiuni strongly-typed (`AiInsights:*` din config) |
| `MedKit.AiInsights/Models/LlmModels.cs` | Modele C# pentru request/response LLM (fără `dynamic`) |
| `MedKit.AiInsights/Llm/LlmRequestBuilder.cs` | Builder fluent pentru `LlmRequest` |
| `MedKit.AiInsights/Llm/OpenAiCompatibleLlmClient.cs` | Client HTTP pentru API compatibil OpenAI + logging latență |
| `MedKit.AiInsights/PdfProcessing/PdfPigTextExtractor.cs` | Extracție text PDF; fallback OCR dacă text < 50 caractere |
| `MedKit.AiInsights/PdfProcessing/TesseractOcrFallback.cs` | OCR pentru PDF-uri scanate (necesită `tessdata/`) |
| `MedKit.AiInsights/Prompts/LabInsightPrompt.v1.txt` | Prompt sistem v1 (embedded resource, versioning explicit) |
| `MedKit.AiInsights/tessdata/.gitkeep` | Folder urmărit de Git |
| `MedKit.AiInsights/tessdata/.gitignore` | Exclude `*.traineddata` din Git (fișiere binare mari) |
| `MedKit.AiInsights.Tests/Mocks/FakeLlmClient.cs` | Implementare fake `ILlmClient` pentru teste |
| `MedKit.AiInsights.Tests/Llm/LlmRequestBuilderTests.cs` | 4 teste builder |
| `MedKit.AiInsights.Tests/Llm/FakeLlmClientTests.cs` | 4 teste FakeLlmClient |
| `MedKit.AiInsights.Tests/PdfProcessing/PdfPigTextExtractorTests.cs` | 4 teste extractor PDF |
| `backend/MedKit.Api/Program.cs` | **Modificat** — DI registration condiționat (`EnableAiFeatures`) |

**Retry + circuit breaker (configurat în `Program.cs`, aplicat pe `ILlmClient`):**
- Retry: 3 încercări, backoff exponențial (2s → 4s → 8s)
- Circuit breaker: deschide după 5 eșecuri consecutive, resetare după 30s

---

## 4. Setup — pași obligatorii înainte de pornire

### 4.1. Rulează migrarea SQL

Deschide SSMS, conectează-te la `MedKitDB` și rulează:

```
database/migrations/010_add_ai_insights_columns.sql
```

Migrarea adaugă:
- Pe `lab_results`: `ai_processing_status`, `ai_processing_error`, `ai_processing_started_at`, `ai_processing_completed_at`
- Pe `lab_ai_insights`: `summary_patient`, `findings_patient`, `recommendations_patient`, `prompt_version`
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

La `dotnet build`, MSBuild le copiază automat în output-ul tuturor proiectelor care referențiază `MedKit.AiInsights` (inclusiv `MedKit.Api` și `MedKit.AiInsights.Tests`).

> **Notă:** Fișierele `*.traineddata` sunt în `.gitignore` — nu se commit-ează în repo.

### 4.4. Configurează secretele (user-secrets)

```bash
cd backend/MedKit.Api

dotnet user-secrets set "AiInsights:LlmEndpoint" "http://<llm-host>:8000/v1"
dotnet user-secrets set "AiInsights:LlmApiKey"   "<api-key>"
dotnet user-secrets set "AiInsights:AiSystemUserId" "<GUID-de-la-pasul-4.2>"
```

---

## 5. Configurare

Secțiunea completă `AiInsights` din `appsettings.json`:

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
| `LlmEndpoint` | URL bază vLLM/TGI (ex: `http://localhost:8000/v1`) — setat prin user-secrets |
| `LlmApiKey` | API key pentru LLM — setat prin user-secrets |
| `ModelName` | Numele modelului trimis în fiecare request |
| `AiSystemUserId` | GUID-ul user-ului de sistem AI din tabelul `users` |
| `MaxTokensPerInsight` | Limita de tokeni per LLM call |
| `EnableAiFeatures` | **Kill-switch global** — `false` = niciun serviciu AI înregistrat în DI |

**Pentru development local**, `appsettings.Development.json` suprascrie `LlmEndpoint` cu `http://localhost:8000/v1` și `EnableAiFeatures: false` (default oprit).

---

## 6. Rulare teste

```bash
cd backend
dotnet test MedKit.AiInsights.Tests/MedKit.AiInsights.Tests.csproj
```

Rezultat așteptat: **12/12 Passed** (8 teste unitare Llm + 4 teste PdfProcessing).

> **Notă despre testele PDF:** `PdfDocumentBuilder` din PdfPig nu generează mapare Unicode (ToUnicode CMap) când folosește fonturi Standard14, deci extracția de text din PDF-uri create programatic returnează mereu string gol. Testele verifică comportamentul corect (no throw, tip corect returnat), nu conținutul textului. Testele de conținut necesită fixture-uri cu PDF-uri reale de la laborator.

---

## 7. Roadmap — Faze rămase

### Faza 2 — Lab Insights *(neimplementat)*

**`MedKit.AiWorker/Jobs/LabAnalysisJob.cs`**
Flow complet de procesare:
1. Marchează `ai_processing_status = 'processing'`
2. Extrage text din PDF (PdfPig → Tesseract dacă < 50 chars)
3. LLM call #1 — parsare structurată: `[{test, value, unit, ref_range}]` (JSON forțat)
4. Rules engine — flagging out-of-range pe fiecare test
5. Adună context: lab anterioare + medicamente active
6. LLM call #2 — generează insight dual (doctor + patient) într-un singur call
7. `OutputValidator` — filtrare safety pe ambele variante
8. INSERT în `lab_ai_insights`; dacă urgency Urgent/Consult Doctor → INSERT `consultation_reminders`
9. Marchează `ai_processing_status = 'completed'`
10. Audit log entry

**`MedKit.AiInsights/Generators/LabInsightGenerator.cs`** — orchestrare LLM calls #1 și #2

**`MedKit.AiInsights/Safety/OutputValidator.cs` + `ForbiddenPatterns.cs`** — verificări:
- JSON valid conform schemei
- Regex pe pattern-uri interzise (diagnostic explicit, doze, contrazicere doctor)
- LLM-as-judge (call #3, model mai mic)
- Lungime minimă/maximă per câmp

**Hangfire setup în `MedKit.AiWorker/Program.cs`** — Hangfire.SqlServer, dashboard, recurring jobs

---

### Faza 3 — Follow-up Reminders *(neimplementat)*

**`MedKit.AiWorker/Jobs/FollowUpReminderJob.cs`** — RecurringJob zilnic la 06:00
- Citește `medical_records WHERE follow_up_in IS NOT NULL`
- Parser `follow_up_in`: regex `^(\d+)\s*(hour|day|week|month|year)s?$`
- Dacă `due_date ∈ [azi, azi+7]` și nu există reminder activ → INSERT `consultation_reminders`
- **Fără AI** — complet determinist

---

### Faza 4 — Endpoint-uri API *(neimplementat)*

**`MedKit.Api/API/Controllers/AiInsightsController.cs`** — endpoint-uri noi:
```
GET  /api/lab-results/{id}/insights           ← insight + ambele variante (rol determină ce vede)
GET  /api/lab-results/{id}/processing-status  ← pentru polling UI
GET  /api/ai-insights/patient/{id}/history-summary
POST /api/ai-insights/patient/{id}/regenerate-summary  ← doar doctor
```

**`MedKit.Api/API/Controllers/LabResultsController.cs`** — **modificat**:
- La `POST /api/lab-results`: după INSERT, `BackgroundJob.Enqueue<LabAnalysisJob>(labResultId)`
- Răspuns 202 Accepted cu `lab_result_id`

**Permisiuni:**
- Pacient: vede doar `*_patient` fields, doar propriile insights
- Doctor specialist: vede ambele variante, doar pacienți cu care are `medical_records`
- Lab doctor: vede ambele variante, doar `lab_results` uploadate de el
- Admin: vede tot, acces logat în `audit_logs`

---

### Faza 5 — History Summary + Chat *(neimplementat)*

**`MedKit.AiInsights/Generators/HistorySummaryGenerator.cs`** — agent cu tool-calling:
- Tool-uri: `get_patient_profile`, `get_medical_records`, `get_lab_results_with_insights`, `get_active_medications`
- Cache 15 min per `(patientId, role)`
- Output: `{chronic_conditions, recent_changes, watch_items}` — dual render

**`MedKit.AiInsights/Generators/ChatAgent.cs`** — agent conversațional:
- Același set de tool-uri ca history summary
- Persistență sesiune în `chat_sessions` + `chat_messages`
- Safety filter pe fiecare răspuns

**`MedKit.Api/API/Controllers/ChatController.cs`**:
```
POST /api/chat/sessions               ← start sesiune nouă
POST /api/chat/sessions/{id}/messages ← trimite mesaj, returnează răspuns AI
GET  /api/chat/sessions/{id}/messages ← istoric
```

---

### Faza 6 — Hardening *(neimplementat)*

- LLM-as-judge layer complet (call #3 pe orice output vizibil)
- Audit log integrat pe toate operațiile AI (cu `model_version`, `prompt_version`, `latency_ms` în `metadata`)
- Metrici latență și rată de eșec per job

---

## 8. Reguli de siguranță AI

Aceste verificări sunt **hardcoded** (nu doar în prompt) și **unit-testate** în `OutputValidator`:

| # | Regulă | Implementare |
|---|---|---|
| 1 | Fără diagnostice explicite | Regex: `aveți (diabet\|hipertensiune\|cancer\|...)` |
| 2 | Fără recomandări de doze | Regex: `luați (\d+)\s*(mg\|ml\|...)` |
| 3 | Fără contrazicere doctor | Regex: `opriți tratamentul cu` |
| 4 | JSON valid conform schemei | Deserializare + validare câmpuri obligatorii |
| 5 | Lungime rezonabilă | Min/max per câmp |
| 6 | LLM-as-judge | Call #3 separat: „Respectă regulile DA/NU?" |
| 7 | Disclaimer vizibil | Câmp `disclaimer` obligatoriu în răspuns |

Dacă oricare verificare pică → `ai_processing_status = 'failed'`, eroarea se salvează în `ai_processing_error`, output-ul **nu** se persistă în `lab_ai_insights`.

---

## 9. Note LLM și hardware

**Model recomandat:** `meta-llama/Llama-3.3-70B-Instruct`

**Server LLM:** vLLM sau TGI cu API compatibil OpenAI (`/v1/chat/completions`).

**Hardware pentru MVP** (<100 insights/zi):
- GPU: 24–48 GB VRAM (ex. RTX 3090/4090 sau A6000)
- Cuantizare Q4 pentru Llama 3.3 70B — încape pe un singur GPU 48GB
- Opțiune cloud: RunPod / Vast.ai (~$1/h) pentru testare, apoi on-premise

**Versionare prompturi:**
- Orice modificare de prompt → versiune nouă (ex. `v1.0.0 → v1.1.0`)
- Fișierele `.txt` sunt embedded resources în `MedKit.AiInsights`
- Versiunea se salvează în `lab_ai_insights.prompt_version` pentru reproductibilitate

**GDPR / EU AI Act:**
- Atâta timp cât output-ul este **informational/assistive** (sumarizare + flagging), nu diagnostic, sistemul e în zona safe conform EU AI Act.
- Adaugă consimțământ explicit la onboarding pentru procesarea AI a datelor medicale (checkbox separat de termenii generali).
- Documentează explicit limitele sistemului: nu face diagnostic, nu prescrie, nu înlocuiește medicul.
