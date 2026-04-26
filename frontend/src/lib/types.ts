export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";
export type Sex = "Male" | "Female" | "Other";

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string; // ISO date string
  sex: Sex;
  nationalId: string;
  phone: string;
  email: string;
  bloodType: BloodType;
  allergies: string;
  currentMedications: string;
  createdAt: string;
  updatedAt: string;
}

export type RouteOfAdministration =
  | "Oral"
  | "IV"
  | "IM"
  | "Subcutaneous"
  | "Topical"
  | "Inhalation"
  | "Sublingual"
  | "Rectal"
  | "Nasal"
  | "Ophthalmic"
  | "Other";

export type DrugFrequency =
  | "Once daily"
  | "Twice daily"
  | "Three times daily"
  | "Four times daily"
  | "Every 4 hours"
  | "Every 5 minutes"
  | "Every 6 hours"
  | "Every 8 hours"
  | "Every 12 hours"
  | "Every 24 hours"
  | "PRN (as needed)"
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Single dose"
  | "Other";

export interface PrescribedDrug {
  id: string;
  name: string;                        // Drug name (generic or brand)
  genericName?: string;                // Generic name if brand used
  dose: string;                        // e.g. "500mg", "10mL"
  route: RouteOfAdministration;        // Route of administration
  frequency: DrugFrequency;            // Dosing frequency
  duration: string;                    // e.g. "7 days", "2 weeks", "indefinite"
  quantity?: string;                   // e.g. "30 tablets", "1 vial"
  refills?: string;                    // e.g. "2 refills", "No refills"
  instructions?: string;               // Special instructions (take with food, etc.)
  indication?: string;                 // Reason for prescribing
  startDate?: string;                  // ISO date
  endDate?: string;                    // ISO date
  prescribedBy: string;                // Doctor name
}

export type UrgencyLevel = "Routine" | "Semi-urgent" | "Urgent" | "Emergency";
export type FollowUpType = "Office visit" | "Phone call" | "Lab work" | "Imaging" | "Specialist referral" | "ER if symptoms worsen" | "None";

export type LabRequestStatus = "Pending" | "In Progress" | "Completed";
export type SampleType = "blood" | "urine" | "stool" | "csf" | "sputum" | "tissue" | "other";

export interface LabRequestResult {
  id: string;
  labRequestId: string;
  submittedByUserId: string;
  submitterName: string;
  observations?: string;
  labResultId?: string;
  labResultFileName?: string;
  submittedAt: string;
}

export interface LabRequest {
  id: string;
  medicalRecordId: string;
  patientId: string;
  patientName: string;
  requestedByDoctorId: string;
  requestedByDoctorName: string;
  sampleTypes: SampleType[];
  status: LabRequestStatus;
  notes?: string;
  viewedByLabAt?: string;
  createdAt: string;
  updatedAt: string;
  results: LabRequestResult[];
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;                        // ISO date string
  doctor: string;
  visitType: "In-person" | "Telemedicine" | "Emergency" | "Follow-up" | "Procedure";
  chiefComplaint: string;              // Primary reason for visit
  diagnosis: string;                   // Primary diagnosis (ICD description)
  icdCode?: string;                    // ICD-10 code
  secondaryDiagnoses?: string;         // Comma-separated secondary diagnoses
  symptoms: string;
  physicalExam?: string;               // Physical examination findings
  vitalSigns?: {
    bloodPressure?: string;            // e.g. "120/80"
    heartRate?: string;                // e.g. "72 bpm"
    temperature?: string;             // e.g. "37.0°C"
    respiratoryRate?: string;          // e.g. "16/min"
    oxygenSaturation?: string;        // e.g. "98%"
    weight?: string;                   // e.g. "75 kg"
    height?: string;                   // e.g. "175 cm"
  };
  treatment: string;                   // General treatment plan narrative
  prescribedDrugs: PrescribedDrug[];  // Detailed drug prescriptions
  procedures?: string;                 // Procedures performed
  urgency: UrgencyLevel;
  followUpIn?: string;                 // e.g. "2 weeks", "1 month"
  followUpType?: FollowUpType;
  referral?: string;                   // Referral to specialist
  patientEducation?: string;           // Education provided to patient
  attachments?: Attachment[];
  createdAt: string;
  labRequest?: LabRequest;
  // Creation-only fields (not returned by API)
  sampleTypes?: SampleType[];
  labRequestNotes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  url: string; // API download URL for saved attachments; blob URL for pending
  size: number;
  file?: File; // present only before upload (pending attachments)
}

export interface LabResult {
  id: string;
  patientId: string;
  uploadedByUserId: string;
  uploaderName: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface Note {
  id: string;
  patientId: string;
  authorId: string;
  date: string;
  author: string;
  content: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  date: string;
  time: string;
  type: string;
  doctor: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  patientId?: string;
  messages: ChatMessage[];
  createdAt: string;
}

export type DoctorRole = "specialist_doctor" | "lab_doctor";
export type UserRole = "specialist_doctor" | "lab_doctor" | "admin" | "patient";

export interface Department {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  departmentId: string;
  department: string;
  phone: string;
  doctorRole: DoctorRole;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  patientId?: string; // links to Patient record when role === "patient"
  doctorId?: string;  // links to Doctor record when role is a doctor variant
  mustChangePassword?: boolean;
}

export interface DoctorProfileStats {
  totalConsultations: number;
  totalPatients: number;
  totalRecords: number;
}

// ─── Patient Portal ────────────────────────────────────────────────────────

export type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "Pending";
export type AppointmentType =
  | "General Consultation"
  | "Follow-up"
  | "Lab Review"
  | "Emergency"
  | "Telemedicine"
  | "Specialist Referral"
  | "Annual Check-up";

export interface AppointmentRequest {
  id: string;
  patientId: string;
  patientName: string;
  requestedDate: string;      // ISO date
  requestedTime: string;      // e.g. "10:00 AM"
  type: AppointmentType;
  reason: string;
  preferredDoctor?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  responseNote?: string;
}

export interface LabAIInsight {
  id: string;
  labResultId: string;
  patientId: string;
  generatedAt: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  urgency: "Normal" | "Monitor" | "Consult Doctor" | "Urgent";
  disclaimer: string;
}

export interface ConsultationReminder {
  id: string;
  patientId: string;
  type: "follow-up-due" | "annual-checkup" | "lab-result-ready" | "medication-refill" | "specialist-referral";
  title: string;
  message: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  dismissed: boolean;
  createdAt: string;
}

export interface DashboardStats {
  recentRecords: number;
  upcomingAppointments: number;
  activeDoctors: number;
}

export interface DoctorSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialty: string;
  departmentId: string;
  department: string;
  doctorRole: DoctorRole;
}

export interface AuditLog {
  id: string;
  performedByUserId: string | null;
  performedByName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  metadata: string | null;
  performedAt: string;
}

// ─── Doctor Schedule ───────────────────────────────────────────────────────

export type ScheduleType = "working_hours" | "block";
export type ScheduleStatus = "active" | "pending_approval";

export interface DoctorScheduleEntry {
  id: string;
  doctorId: string;
  scheduleType: ScheduleType;
  dayOfWeek?: number;
  specificDate?: string;
  startTime?: string;
  endTime?: string;
  isWorkingDay: boolean;
  isFullDay: boolean;
  reason?: string;
  status: ScheduleStatus;
  proposedByUserId?: string;
  proposedByName?: string;
  replacesScheduleId?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleEntryPayload {
  scheduleType: ScheduleType;
  dayOfWeek?: number;
  specificDate?: string;
  startTime?: string;
  endTime?: string;
  isWorkingDay: boolean;
  isFullDay: boolean;
  reason?: string;
}

// ─── User Notifications ────────────────────────────────────────────────────

export interface UserNotification {
  id: string;
  userId: string;
  notificationRuleId: string | null;
  title: string;
  body: string | null;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}
