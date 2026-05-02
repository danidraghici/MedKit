# AI Insights System — Implementation Brief for Claude Code

> **Cum folosești acest fișier:** Salvează-l în repo ca `docs/AI_INSIGHTS_BRIEF.md`, apoi pornește Claude Code în root-ul proiectului și rulează prompt-ul de la final. Claude Code va citi acest brief, va analiza codul existent și va propune un plan de implementare incremental.

---

## 1. Context proiect

Aplicație medicală **MedKit** cu trei roluri: `admin`, `doctor` (sub-roluri: `specialist_doctor`, `lab_doctor`) și `patient`.

- **Backend:** ASP.NET Core (.NET 8+)
- **DB:** SQL Server 2016+ (schema `MedKitDB`, 16 tabele, audit triggers active)
- **Auth:** users.role + JWT (presupunem că există deja)
- **Storage lab files:** filesystem local, path în `lab_results.blob_name`

Schema DB completă e în `db/schema_medkit_db.sql` (sau echivalent în repo).

## 2. Ce vrem să construim

Un **sistem de AI Insights** pentru pacienți și doctori, cu patru capabilități:

| # | Capabilitate | Tip | Tabel țintă |
|---|--------------|-----|-------------|
| 1 | Reminder de reprogramare la follow-up | Deterministic (NU AI) | `consultation_reminders` |
| 2 | Analiză automată a rezultatelor de laborator (PDF) | AI + reguli | `lab_ai_insights` |
| 3 | Sumarizare istoric medical (on-demand) | AI | endpoint în memorie + cache |
| 4 | Chat AI cu context pacient | AI cu tool-calling | `chat_sessions` + `chat_messages` |

**Render dual:** fiecare insight (când e cazul) trebuie să producă **două variante** — una pentru pacient (limbaj simplu, RO, cu disclaimer vizibil) și una pentru doctor (limbaj clinic, RO, cu trimiteri la ghiduri). Ambele sunt generate în paralel din același call LLM.

## 3. LLM self-hosted — contract de integrare

LLM-ul rulează separat (vLLM sau TGI), expune **API compatibil OpenAI** (`/v1/chat/completions` + tool calling).

Configurare prin `appsettings.json`:

```json
{
  "AiInsights": {
    "LlmEndpoint": "http://llm-host:8000/v1",
    "LlmApiKey": "dummy-key",
    "ModelName": "meta-llama/Llama-3.3-70B-Instruct",
    "AiSystemUserId": "<guid-user-creat-pentru-AI-system>",
    "MaxTokensPerInsight": 2000,
    "EnableAiFeatures": true
  }
}
```

**Flag global `EnableAiFeatures`** — când e `false`, toate endpoint-urile AI returnează 503 + mesaj clar. Util în dev și pentru kill-switch.

## 4. Reguli inviolabile pentru orice output AI

Astea trebuie să fie hardcoded ca verificări (unit-test-uite), nu doar în prompt:

1. **NU se pun diagnostice.** Output-ul nu poate conține fraze de tipul „aveți X boală". Folosim formulări de tipul „valoare în afara intervalului de referință".
2. **NU se recomandă doze sau medicamente noi.** AI-ul poate semnala interacțiuni între medicamente deja prescrise, dar nu prescrie.
3. **NU contrazice doctorul.** Inconsistențele se semnalează ca „punct de discutat cu medicul", niciodată ca „doctorul a greșit".
4. **Disclaimer obligatoriu** la fiecare răspuns vizibil pacientului.
5. **Sursă de date controlată** — agentul accesează DB doar prin tool-uri definite, niciodată SQL liber.
6. **Audit log** — fiecare insight generat se loghează în `audit_logs` cu user-ul de sistem AI și `metadata = { model_version, prompt_version, latency_ms }`.

## 5. Modificări necesare la schema DB

Înainte de orice cod, adaugă în `db/migrations/` un script:

```sql
-- 1. Status processing pentru lab_results (UI need to know if AI is still working)
ALTER TABLE lab_results 
    ADD ai_processing_status NVARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT CK_lab_results_ai_status 
        CHECK (ai_processing_status IN ('pending','processing','completed','failed','skipped'));

ALTER TABLE lab_results 
    ADD ai_processing_error NVARCHAR(MAX) NULL;

ALTER TABLE lab_results 
    ADD ai_processing_started_at  DATETIMEOFFSET(7) NULL;
ALTER TABLE lab_results 
    ADD ai_processing_completed_at DATETIMEOFFSET(7) NULL;

-- 2. Render dual în lab_ai_insights — adaugă variantă pentru pacient
-- Coloana existentă `summary` rămâne pentru doctor (registru clinic).
ALTER TABLE lab_ai_insights 
    ADD summary_patient NVARCHAR(MAX) NULL;

ALTER TABLE lab_ai_insights 
    ADD findings_patient NVARCHAR(MAX) NULL;        -- JSON array, limbaj simplu

ALTER TABLE lab_ai_insights 
    ADD recommendations_patient NVARCHAR(MAX) NULL; -- JSON array, limbaj simplu

ALTER TABLE lab_ai_insights 
    ADD prompt_version NVARCHAR(50) NULL;           -- ex: "v1.0.0"

-- 3. User de sistem pentru AI (audit trail)
-- (Inserează manual cu un GUID generat. Folosește acest GUID în appsettings.)
-- INSERT INTO users (id, email, password_hash, name, role, is_active)
-- VALUES (NEWID(), 'ai-system@medkit.internal', 'NOT_A_REAL_HASH', 'AI System', 'admin', 1);
```

> **Notă:** Coloanele `summary`, `findings`, `recommendations` existente rămân pentru render-ul **doctor**. Cele cu sufix `_patient` sunt pentru pacient. Frontend-ul alege ce afișează pe baza rolului.

## 6. Arhitectura proiectelor (.NET)

Structură propusă (Claude Code o adaptează la convențiile existente în repo):

```
MedKit.sln
├── MedKit.Api/                  # proiectul existent
│   └── Controllers/
│       ├── LabResultsController.cs       # MODIFICAT: trigger job after upload
│       └── AiInsightsController.cs       # NOU: GET history-summary, chat endpoints
│
├── MedKit.AiInsights/           # PROIECT NOU (class library)
│   ├── Abstractions/
│   │   ├── ILlmClient.cs
│   │   ├── IPdfTextExtractor.cs
│   │   ├── ILabReportParser.cs
│   │   └── IInsightGenerator.cs
│   ├── Llm/
│   │   ├── OpenAiCompatibleLlmClient.cs  # HttpClient către vLLM
│   │   └── LlmRequestBuilder.cs
│   ├── PdfProcessing/
│   │   ├── PdfPigTextExtractor.cs        # UglyToad.PdfPig
│   │   └── TesseractOcrFallback.cs       # pentru PDF scanate
│   ├── Prompts/
│   │   ├── LabInsightPrompt.v1.txt       # versionat!
│   │   ├── HistorySummaryPrompt.v1.txt
│   │   └── ChatAgentPrompt.v1.txt
│   ├── Tools/                            # tool definitions pt LLM agent
│   │   └── PatientDataTools.cs
│   ├── Safety/
│   │   ├── OutputValidator.cs            # regex + LLM-as-judge
│   │   └── ForbiddenPatterns.cs
│   ├── Generators/
│   │   ├── LabInsightGenerator.cs
│   │   ├── HistorySummaryGenerator.cs
│   │   └── ChatAgent.cs
│   └── Models/
│       ├── LabInsightResult.cs           # DTO bidirecțional (doctor + patient)
│       └── ...
│
├── MedKit.AiWorker/             # PROIECT NOU (worker service)
│   ├── Program.cs                # HostBuilder + Hangfire + DI
│   ├── Jobs/
│   │   ├── LabAnalysisJob.cs
│   │   └── FollowUpReminderJob.cs        # recurring, zilnic
│   └── appsettings.json
│
└── MedKit.AiInsights.Tests/     # PROIECT NOU (xUnit)
    ├── Safety/
    │   └── OutputValidatorTests.cs
    ├── Prompts/
    │   └── LabInsightPromptTests.cs
    └── Mocks/
        └── FakeLlmClient.cs
```

## 7. Pachete NuGet

În `MedKit.AiInsights`:
- `UglyToad.PdfPig` (extracție text PDF)
- `Tesseract` (OCR fallback)
- `Microsoft.Extensions.Http.Polly` (retry/circuit breaker pentru LLM)
- `System.Text.Json`

În `MedKit.AiWorker`:
- `Hangfire.AspNetCore`
- `Hangfire.SqlServer`
- `Microsoft.Extensions.Hosting`

În `MedKit.AiInsights.Tests`:
- `xunit`, `FluentAssertions`, `Moq`

## 8. Flow-uri concrete

### 8.1. Lab analysis (cel mai important)

```
1. lab_doctor face POST /api/lab-results (upload PDF)
2. LabResultsController:
   - salvează fișierul pe disk
   - INSERT în lab_results cu ai_processing_status = 'pending'
   - BackgroundJob.Enqueue<LabAnalysisJob>(id)
   - returnează 202 Accepted cu lab_result_id
3. LabAnalysisJob (în MedKit.AiWorker):
   a. UPDATE lab_results SET ai_processing_status='processing', started_at=NOW
   b. Extrage text PDF (PdfPig → fallback Tesseract dacă text gol)
   c. LLM call #1: parsare structurată — extrage [{test, value, unit, ref_range}]
      → output JSON forțat prin response_format
   d. Rules engine: aplică flagging out-of-range pe fiecare test
   e. Adună context: ultimele lab results pentru aceleași teste, medicamente active
   f. LLM call #2: generare insight — produce SIMULTAN versiunea doctor + patient
      → output JSON cu schema definită (vezi 8.4)
   g. Safety filter pe ambele variante (regex + LLM-as-judge)
   h. INSERT în lab_ai_insights (toate cele 6 câmpuri: doctor + patient)
   i. Dacă urgency ∈ {Urgent, Consult Doctor} → INSERT consultation_reminders
   j. UPDATE lab_results SET ai_processing_status='completed', completed_at=NOW
   k. Audit log entry
4. Frontend face polling sau SignalR → afișează când e gata
```

### 8.2. Follow-up reminders (deterministic)

```
Hangfire RecurringJob, rulează zilnic la 06:00:
1. SELECT medical_records WHERE follow_up_in IS NOT NULL
2. Pentru fiecare:
   - parsează "2 weeks", "1 month", "48 hours" → DateTime due_date
   - dacă due_date ∈ [today, today+7] și NU există deja un reminder activ:
     → INSERT consultation_reminders (type='follow-up-due', priority='medium')
3. Audit log
```

**Parser pentru follow_up_in:** regex `^(\d+)\s*(hour|day|week|month|year)s?$` cu suport RO opțional.

### 8.3. History summary (on-demand)

```
GET /api/ai-insights/patient/{patientId}/history-summary
- verifică permisiuni (pacient propriu / doctor cu acces)
- cache 15 min per (patientId, role)
- agentul folosește tool-uri pentru:
  * get_patient_profile
  * get_medical_records (last 12 luni)
  * get_lab_results_with_insights (last 12 luni)
  * get_active_medications
- LLM produce JSON cu chronic_conditions, recent_changes, watch_items
- response include AMBELE variante (frontend alege după rol)
```

### 8.4. Schema JSON pentru lab insight

LLM-ul trebuie să returneze EXACT acest format (folosește `response_format: json_schema` dacă e suportat, altfel forțezi prin prompt + validare):

```json
{
  "urgency": "Normal | Monitor | Consult Doctor | Urgent",
  "doctor": {
    "summary": "...registru clinic, RO...",
    "findings": ["finding 1", "finding 2"],
    "recommendations": ["rec 1", "rec 2"]
  },
  "patient": {
    "summary": "...limbaj simplu, RO...",
    "findings": ["explicație pentru pacient 1", "..."],
    "recommendations": ["acțiune simplă 1", "..."]
  },
  "flagged_tests": [
    {
      "test_name": "HbA1c",
      "value": 7.8,
      "unit": "%",
      "reference_range": "4.0-6.0",
      "deviation": "high",
      "trend_vs_previous": "increasing"
    }
  ]
}
```

## 9. System prompt — structură (NU implementare finală)

Stocat în `MedKit.AiInsights/Prompts/LabInsightPrompt.v1.txt`. Schelet:

```
Ești un asistent medical informațional pentru platforma MedKit (RO).
Rolul tău: SUMARIZARE și CONTEXTUALIZARE date lab — NU diagnostic, NU prescripție.

REGULI ABSOLUTE (violarea = output respins):
1. NU folosi formulări de diagnostic ("aveți X", "suferiti de Y").
   Folosește: "valoare peste interval", "tendință crescătoare", "necesită discuție cu medicul".
2. NU recomanda doze, medicamente noi, schimbări tratament.
3. NU contrazice tratamentul prescris. Inconsistențele = "punct de discutat cu medicul curant".
4. Output-ul TREBUIE să fie JSON valid conform schemei furnizate, fără text înainte/după.
5. Două registre obligatorii:
   - "doctor": clinic, abrevieri OK, valori numerice cu unități
   - "patient": simplu, fără jargon, fraze scurte, RO standard
6. Dacă datele sunt insuficiente, scrie explicit "date insuficiente pentru evaluare".

DATE FURNIZATE (în mesajul user):
- Profil pacient: vârstă, gen, alergii, medicamente curente
- Rezultate lab curente (parsate)
- Lab results anterioare pentru aceleași teste (pentru trend)
- Recomandări active din ultima consultație

OUTPUT: doar JSON, conform schemei.
```

## 10. Safety filter — verificări obligatorii

Înainte ca un insight să ajungă în DB:

1. **JSON valid** conform schemei.
2. **Pattern-uri interzise** (regex pe ambele variante):
   - „aveți (diabet|hipertensiune|cancer|...)" — diagnostic explicit
   - „luați (\d+)\s*(mg|ml|...)" — recomandări de doze
   - „opriți tratamentul cu" — contrazicere doctor
3. **LLM-as-judge** (call #3, model mai mic): „Răspunde DA/NU: respectă acest text regulile {...}?"
4. **Lungime minimă/maximă** rezonabilă per câmp.
5. Dacă pică oricare verificare → `ai_processing_status = 'failed'`, nu salvăm output-ul, salvăm eroarea.

## 11. Endpoint-uri noi (pentru `MedKit.Api`)

```
POST   /api/lab-results                          (existent, modificat — trigger job)
GET    /api/lab-results/{id}/insights            (NOU — returnează lab_ai_insight, both variants)
GET    /api/lab-results/{id}/processing-status   (NOU — pentru polling UI)

GET    /api/ai-insights/patient/{id}/history-summary  (NOU)
POST   /api/ai-insights/patient/{id}/regenerate-summary (NOU, doar doctor)

POST   /api/chat/sessions                        (NOU — start new session)
POST   /api/chat/sessions/{id}/messages          (NOU — send message, returnează răspuns AI)
GET    /api/chat/sessions/{id}/messages          (NOU — istoric)

GET    /api/consultation-reminders               (existent probabil — verifică)
PATCH  /api/consultation-reminders/{id}/dismiss  (existent probabil)
```

## 12. Permisiuni pe endpoint-uri AI

- Pacientul vede **doar propriile** insights (filtru pe `patient_id == users.patient_id`).
- Doctorul specialist vede insights ale pacienților **cu care are istoric** (a creat medical_records).
- Lab doctor vede insights doar pe lab_results pe care le-a urcat el.
- Admin vede tot, **dar accesul logat ca VIEW** în audit_logs.
- Răspunsurile API către pacient: doar câmpurile `*_patient`.
- Răspunsurile către doctor/admin: ambele variante.

## 13. Plan incremental sugerat (pentru Claude Code)

**Faza 0 — Setup (1 task)**
- Creează proiectele `MedKit.AiInsights`, `MedKit.AiWorker`, `MedKit.AiInsights.Tests`.
- Adaugă referințe + pachete NuGet.
- Adaugă migrarea SQL din secțiunea 5.
- Adaugă configurarea `AiInsights` în `appsettings.json` (cu `EnableAiFeatures: false` initial).

**Faza 1 — Foundations (3 tasks)**
- Implementează `ILlmClient` + `OpenAiCompatibleLlmClient` cu Polly retry.
- Implementează `IPdfTextExtractor` cu PdfPig + fallback Tesseract.
- Scrie testele pentru aceste componente cu fake LLM.

**Faza 2 — Lab Insights (4 tasks)**
- `LabAnalysisJob` cu schema flow-ul din 8.1.
- `LabInsightGenerator` cu prompt v1.
- `OutputValidator` cu reguli din secțiunea 10.
- Hangfire setup în `MedKit.AiWorker`.

**Faza 3 — Reminders (1 task)**
- `FollowUpReminderJob` recurring, deterministic.

**Faza 4 — API endpoints (2 tasks)**
- `AiInsightsController` + DTO-uri.
- Modificare `LabResultsController` pentru a porni job-ul.

**Faza 5 — History summary + Chat (3 tasks)**
- `HistorySummaryGenerator`.
- `ChatAgent` cu tool-calling.
- `ChatController`.

**Faza 6 — Hardening (2 tasks)**
- LLM-as-judge layer.
- Audit log integration peste tot.

> Claude Code: după ce citești acest brief, **ÎNCEPE PRIN A SCRIE ÎNAPOI UN PLAN DE ACȚIUNE PENTRU FAZA 0 ȘI FAZA 1**, NU TOT. Așteaptă confirmarea înainte să scrii cod pentru fazele următoare.

---

# ÎNTREABĂRI PE CARE TREBUIE SĂ LE PUI ÎNAINTE SĂ ÎNCEPI

Claude Code, înainte de a scrie cod, răspunde-mi întâi la astea (citește repo-ul ca să-ți răspunzi singur unde se poate):

1. Ce versiune de .NET folosește proiectul curent? (verifică `*.csproj`)
2. Există deja un setup pentru DI/middleware autentificare? Cum citesc user-ul curent în controller?
3. Există deja un wrapper EF Core / DbContext? Sau folosim Dapper?
4. Cum sunt structurate controller-ele existente (convenții de naming, base controller, etc.)?
5. Există deja o convenție pentru DTOs (folder, namespace, mapper — AutoMapper / manual)?
6. Cum se face logging în proiect (Serilog? ILogger built-in?)?
7. Există deja un mecanism pentru background jobs sau introducem Hangfire de la zero?
8. Cum se face configurarea per-environment (Development / Production)?

Pentru fiecare întrebare, citează fișierul și liniile din care ai dedus răspunsul.

---

# PROMPT-UL EFECTIV PE CARE ÎL DAI LUI CLAUDE CODE

Copiază tot ce e mai jos și rulează în Claude Code (în root-ul repo-ului):

```
Citește docs/AI_INSIGHTS_BRIEF.md în întregime — e specificația completă pentru un sistem de AI Insights pe care îl adăugăm la aplicația MedKit.

Apoi:

1. Explorează repo-ul curent (structură proiecte, convenții de cod, pachete folosite, modul de auth, EF Core / Dapper, logging, environment config) și răspunde la cele 8 întrebări din finalul brief-ului. Pentru fiecare răspuns, citează fișierul și numărul de linie.

2. Verifică dacă există deja entități EF / clase pentru tabelele lab_results, lab_ai_insights, medical_records, consultation_reminders, chat_sessions, chat_messages. Dacă nu, semnalează că trebuie generate (NU le genera încă).

3. Pe baza analizei, propune un plan concret pentru FAZA 0 (Setup) și FAZA 1 (Foundations) din brief, adaptat la convențiile existente în acest repo. Plan-ul trebuie să includă:
   - Lista exactă de fișiere noi de creat, cu path-urile lor
   - Lista de fișiere existente de modificat, cu ce schimbări
   - Dependințele NuGet de adăugat în fiecare proiect
   - Migrarea SQL ca fișier separat (path + nume convenție)

4. NU SCRIE COD ÎNCĂ. Așteaptă ca eu să confirm planul. După confirmare, implementezi Faza 0 + Faza 1, apoi te oprești și aștepți review înainte de Faza 2.

Reguli stricte pe parcursul implementării:
- Nu modifica schema DB existentă, doar adaugi (migrare nouă, ALTER TABLE).
- Nu introduce librării noi nemenționate în brief fără să întrebi.
- Toate string-urile vizibile pacientului în limba română.
- Toate prompt-urile LLM le scrii în fișiere .txt versionate (nu hardcoded în C#).
- Pentru orice tool LLM, definești OBLIGATORIU input/output schema în clase C# (no dynamic).
- Orice apel LLM trece prin ILlmClient — niciodată HttpClient direct în business logic.
- Nu scrie cod care să trimită date pacient către servicii externe — totul rămâne în infrastructura noastră.

Începe.
```

---

## Note finale pentru tine (autor proiect)

- **GDPR:** adaugă în Privacy Policy o secțiune separată despre procesarea AI a datelor medicale + obține consimțământ explicit la onboarding (un checkbox separat de termenii generali).
- **MDR / EU AI Act:** atâta timp cât output-ul e clar **informational/assistive** (sumarizare + flagging) și nu **diagnostic**, ești în zona safe. Documentează asta — limitele explicite ale sistemului. Dacă mai târziu vrei sugestii de diagnostic, atunci intri în high-risk și ai nevoie de certificare.
- **Hardware LLM:** pentru un MVP cu volum mic (<100 insights/zi), un singur GPU 24-48GB cu Llama 3.3 70B Q4 e suficient. Începe pe RunPod / Vast.ai (~$1/h) pentru testare, apoi cumperi sau închiriezi pe termen lung.
- **Versionare prompts:** orice modificare de prompt = `prompt_version` nou (v1.0.0 → v1.1.0). Salvezi versiunea în `lab_ai_insights.prompt_version` ca să poți reproduce / debug-ui orice insight vechi.