import type { Patient, MedicalRecord, LabResult, Note, Appointment, ChatSession } from "./types";

export const MOCK_PATIENTS: Patient[] = [
  {
    id: "p001",
    fullName: "James Harrison",
    dateOfBirth: "1978-04-12",
    sex: "Male",
    nationalId: "NH-78041201",
    phone: "+1 (555) 234-5678",
    email: "james.harrison@email.com",
    bloodType: "O+",
    allergies: "Penicillin, Sulfonamides",
    currentMedications: "Lisinopril 10mg daily, Atorvastatin 20mg",
    createdAt: "2023-01-15T08:00:00Z",
    updatedAt: "2024-11-20T14:30:00Z",
  },
  {
    id: "p002",
    fullName: "Maria Santos",
    dateOfBirth: "1992-09-27",
    sex: "Female",
    nationalId: "NH-92092701",
    phone: "+1 (555) 345-6789",
    email: "maria.santos@email.com",
    bloodType: "A+",
    allergies: "None known",
    currentMedications: "Metformin 500mg twice daily",
    createdAt: "2023-03-20T10:00:00Z",
    updatedAt: "2024-12-01T09:00:00Z",
  },
  {
    id: "p003",
    fullName: "Robert Chen",
    dateOfBirth: "1965-11-03",
    sex: "Male",
    nationalId: "NH-65110301",
    phone: "+1 (555) 456-7890",
    email: "robert.chen@email.com",
    bloodType: "B+",
    allergies: "Aspirin, NSAIDs",
    currentMedications: "Amlodipine 5mg, Omeprazole 20mg",
    createdAt: "2022-07-10T11:00:00Z",
    updatedAt: "2024-10-15T16:00:00Z",
  },
  {
    id: "p004",
    fullName: "Susan Mitchell",
    dateOfBirth: "1985-06-18",
    sex: "Female",
    nationalId: "NH-85061801",
    phone: "+1 (555) 567-8901",
    email: "susan.mitchell@email.com",
    bloodType: "AB+",
    allergies: "Latex, Codeine",
    currentMedications: "Levothyroxine 50mcg",
    createdAt: "2023-06-05T13:00:00Z",
    updatedAt: "2024-11-30T11:00:00Z",
  },
  {
    id: "p005",
    fullName: "David Park",
    dateOfBirth: "1990-02-14",
    sex: "Male",
    nationalId: "NH-90021401",
    phone: "+1 (555) 678-9012",
    email: "david.park@email.com",
    bloodType: "O-",
    allergies: "None known",
    currentMedications: "Albuterol inhaler PRN",
    createdAt: "2024-01-08T09:00:00Z",
    updatedAt: "2024-12-05T10:00:00Z",
  },
  {
    id: "p006",
    fullName: "Linda Johnson",
    dateOfBirth: "1958-07-22",
    sex: "Female",
    nationalId: "NH-58072201",
    phone: "+1 (555) 789-0123",
    email: "linda.johnson@email.com",
    bloodType: "A-",
    allergies: "Shellfish (non-drug allergy)",
    currentMedications: "Metoprolol 25mg, Furosemide 40mg, Warfarin 5mg",
    createdAt: "2022-02-14T07:00:00Z",
    updatedAt: "2024-12-10T08:00:00Z",
  },
];

export const MOCK_MEDICAL_RECORDS: MedicalRecord[] = [];

// Lab results are now file attachments fetched from the API — no mock data needed.
export const MOCK_LAB_RESULTS: LabResult[] = [];

export const MOCK_NOTES: Note[] = [
  {
    id: "n001",
    patientId: "p001",
    authorId: "d001",
    date: "2024-11-20",
    author: "Dr. Emily Carter",
    content: "Patient is highly compliant with medications. Counselled on importance of fluid intake and dietary oxalate restriction. Patient understands need for metabolic stone workup after acute episode resolves.",
  },
  {
    id: "n002",
    patientId: "p001",
    authorId: "d001",
    date: "2024-08-15",
    author: "Dr. Emily Carter",
    content: "Family history of hypertension (father, paternal uncle). Lifestyle modifications discussed including DASH diet, regular exercise. Patient motivated to make dietary changes.",
  },
  {
    id: "n003",
    patientId: "p002",
    authorId: "d002",
    date: "2024-12-01",
    author: "Dr. Michael Torres",
    content: "Patient reports good adherence to Metformin. Mild GI side effects initially but resolved. Referred to dietitian for ongoing support. Weight stable at 72kg.",
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt001",
    patientId: "p001",
    patientName: "James Harrison",
    date: "2025-01-15",
    time: "09:00",
    type: "Follow-up - Kidney Stone",
    doctor: "Dr. Emily Carter",
    status: "Planificată",
  },
  {
    id: "apt002",
    patientId: "p002",
    patientName: "Maria Santos",
    date: "2025-01-18",
    time: "10:30",
    type: "Diabetes Review",
    doctor: "Dr. Michael Torres",
    status: "Planificată",
  },
  {
    id: "apt003",
    patientId: "p003",
    patientName: "Robert Chen",
    date: "2025-01-12",
    time: "14:00",
    type: "Urology Consult",
    doctor: "Dr. Emily Carter",
    status: "Planificată",
  },
  {
    id: "apt004",
    patientId: "p004",
    patientName: "Susan Mitchell",
    date: "2025-01-20",
    time: "11:00",
    type: "Thyroid Review",
    doctor: "Dr. Michael Torres",
    status: "Planificată",
  },
];

export const INITIAL_CHAT_SESSION: ChatSession = {
  id: "session-001",
  messages: [],
  createdAt: new Date().toISOString(),
};

// ─── Patient Portal Mock Data ──────────────────────────────────────────────

export const MOCK_APPOINTMENT_REQUESTS: import("./types").AppointmentRequest[] = [
  {
    id: "ar001",
    patientId: "p001",
    patientName: "James Harrison",
    requestedDate: "2025-02-10",
    requestedTime: "10:00 AM",
    type: "Consult",
    reason: "Post-kidney stone follow-up and repeat ultrasound review",
    preferredDoctor: "Dr. Emily Carter",
    status: "Approved",
    createdAt: "2025-01-25T09:00:00Z",
    responseNote: "Confirmed for Feb 10 at 10:00 AM with Dr. Carter.",
  },
  {
    id: "ar002",
    patientId: "p001",
    patientName: "James Harrison",
    requestedDate: "2025-03-05",
    requestedTime: "02:00 PM",
    type: "Analize laborator - prelevare",
    reason: "Review metabolic panel and calcium levels",
    preferredDoctor: "Dr. Emily Carter",
    status: "Pending",
    createdAt: "2025-01-28T11:00:00Z",
  },
  {
    id: "ar003",
    patientId: "p002",
    patientName: "Maria Santos",
    requestedDate: "2025-02-14",
    requestedTime: "09:30 AM",
    type: "Control",
    reason: "Routine diabetes check and HbA1c review",
    preferredDoctor: "Dr. Michael Torres",
    status: "Approved",
    createdAt: "2025-01-20T14:00:00Z",
    responseNote: "Confirmed. Please fast for 8 hours before the appointment.",
  },
];

export const MOCK_LAB_AI_INSIGHTS: import("./types").LabAIInsight[] = [
  {
    id: "ins001",
    labResultId: "lr001",
    patientId: "p001",
    generatedAt: "2024-11-20T15:00:00Z",
    urgency: "Consult Doctor",
    summary:
      "Your urinalysis showed the presence of red blood cells and calcium oxalate crystals, which is consistent with a kidney stone diagnosis. This finding has been reviewed by your doctor.",
    findings: [
      "Red blood cells detected in urine (hematuria)",
      "Calcium oxalate crystals present — most common type of kidney stone",
      "Result is outside the normal range (Abnormal)",
      "Note: Calcium oxalate crystals seen. Consistent with kidney stone.",
    ],
    recommendations: [
      "Increase daily water intake to at least 2.5–3 litres",
      "Reduce foods high in oxalate (spinach, nuts, chocolate)",
      "Follow up with your doctor regarding metabolic stone workup",
      "Strain urine as instructed to capture any passed stone material",
    ],
    disclaimer:
      "This AI-generated insight is for informational purposes only and does not constitute medical advice. Always consult your doctor before making any health decisions.",
  },
  {
    id: "ins002",
    labResultId: "lr002",
    patientId: "p001",
    generatedAt: "2024-11-20T15:05:00Z",
    urgency: "Monitor",
    summary:
      "Your serum creatinine is mildly elevated above the normal range. This may indicate reduced kidney function and should be monitored.",
    findings: [
      "Serum Creatinine: 1.4 mg/dL (reference: 0.7–1.3 mg/dL)",
      "Mildly above the upper limit of normal",
      "May reflect temporary strain on the kidneys from the recent stone episode",
    ],
    recommendations: [
      "Stay well hydrated to support kidney function",
      "Avoid NSAIDs and nephrotoxic medications unless prescribed",
      "Repeat creatinine test at your follow-up appointment",
      "Report any reduced urine output to your doctor",
    ],
    disclaimer:
      "This AI-generated insight is for informational purposes only and does not constitute medical advice. Always consult your doctor before making any health decisions.",
  },
  {
    id: "ins003",
    labResultId: "lr004",
    patientId: "p002",
    generatedAt: "2024-12-01T10:00:00Z",
    urgency: "Monitor",
    summary:
      "Your HbA1c is 7.1%, slightly above the target of <7.0% for people with diabetes. Your doctor has noted this and reinforced dietary guidance.",
    findings: [
      "HbA1c: 7.1% (target: <7.0%)",
      "Reflects average blood glucose over the past 2–3 months",
      "Slightly above the recommended target range",
    ],
    recommendations: [
      "Continue taking Metformin as prescribed",
      "Maintain a low-GI, low-sugar diet",
      "Aim for at least 30 minutes of moderate exercise most days",
      "Monitor blood glucose at home as advised",
      "Attend your next HbA1c check in 3 months",
    ],
    disclaimer:
      "This AI-generated insight is for informational purposes only and does not constitute medical advice. Always consult your doctor before making any health decisions.",
  },
];

export const MOCK_CONSULTATION_REMINDERS: import("./types").ConsultationReminder[] = [
  {
    id: "rem001",
    patientId: "p001",
    type: "follow-up-due",
    title: "Follow-up appointment due",
    message:
      "Your follow-up for the kidney stone episode is due. Dr. Carter recommended a repeat ultrasound and metabolic panel within 4–6 weeks of your emergency visit on Nov 20.",
    dueDate: "2025-01-20",
    priority: "high",
    dismissed: false,
    createdAt: "2025-01-01T08:00:00Z",
  },
  {
    id: "rem002",
    patientId: "p001",
    type: "lab-result-ready",
    title: "New lab results available",
    message:
      "Your recent lab results from Nov 20 are ready to view. Review your urinalysis and serum creatinine results with AI insights in the Lab Results section.",
    dueDate: "2024-11-21",
    priority: "medium",
    dismissed: false,
    createdAt: "2024-11-21T07:00:00Z",
  },
  {
    id: "rem003",
    patientId: "p001",
    type: "medication-refill",
    title: "Tamsulosin refill due",
    message:
      "Your Tamsulosin 0.4mg prescription is due for a refill. You were prescribed 1 refill — contact your pharmacy or request a prescription renewal.",
    dueDate: "2025-01-18",
    priority: "medium",
    dismissed: false,
    createdAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "rem004",
    patientId: "p002",
    type: "lab-result-ready",
    title: "HbA1c results available",
    message:
      "Your HbA1c and fasting glucose results from Dec 1 are now available. Your doctor has reviewed them — check the AI insights for a plain-language summary.",
    dueDate: "2024-12-02",
    priority: "medium",
    dismissed: false,
    createdAt: "2024-12-02T08:00:00Z",
  },
  {
    id: "rem005",
    patientId: "p002",
    type: "annual-checkup",
    title: "Annual eye exam due",
    message:
      "Your annual diabetic eye exam is due. Regular screening is important to detect early signs of diabetic retinopathy. Please book with an ophthalmologist.",
    dueDate: "2025-02-01",
    priority: "medium",
    dismissed: false,
    createdAt: "2025-01-01T08:00:00Z",
  },
  {
    id: "rem006",
    patientId: "p002",
    type: "specialist-referral",
    title: "Urine microalbumin test ordered",
    message:
      "Dr. Torres has ordered a urine microalbumin test to check for early signs of kidney involvement from diabetes. Please visit the lab at your earliest convenience.",
    dueDate: "2025-01-30",
    priority: "low",
    dismissed: false,
    createdAt: "2025-01-05T08:00:00Z",
  },
  {
    id: "rem007",
    patientId: "p003",
    type: "specialist-referral",
    title: "Urology referral pending",
    message:
      "You have been referred to a urologist (Dr. Patterson) for your recurrent kidney stone history. Please contact the urology clinic to schedule your appointment.",
    dueDate: "2025-01-15",
    priority: "high",
    dismissed: false,
    createdAt: "2024-10-16T09:00:00Z",
  },
];
