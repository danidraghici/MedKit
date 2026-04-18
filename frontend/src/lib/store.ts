import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Patient, MedicalRecord, LabResult, Note, Appointment, ChatSession, ChatMessage, User,
  AppointmentRequest, LabAIInsight, ConsultationReminder, Doctor, DoctorRole,
} from "./types";
import {
  MOCK_PATIENTS,
  MOCK_MEDICAL_RECORDS,
  MOCK_LAB_RESULTS,
  MOCK_NOTES,
  MOCK_APPOINTMENTS,
  MOCK_APPOINTMENT_REQUESTS,
  MOCK_LAB_AI_INSIGHTS,
  MOCK_CONSULTATION_REMINDERS,
} from "./mockData";

function generateId(prefix: string): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (email: string, password: string, remember: boolean) => boolean;
  logout: () => void;

  // Doctors (managed by admin)
  doctors: Doctor[];
  addDoctor: (doctor: Omit<Doctor, "id" | "createdAt">) => Doctor;
  updateDoctor: (id: string, updates: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;
  getDoctor: (id: string) => Doctor | undefined;

  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;

  // Medical Records
  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, "id" | "createdAt">) => MedicalRecord;
  getMedicalRecords: (patientId: string) => MedicalRecord[];

  // Lab Results
  labResults: LabResult[];
  getLabResults: (patientId: string) => LabResult[];
  addLabResult: (result: Omit<LabResult, "id">) => LabResult;

  // Notes
  notes: Note[];
  getNotes: (patientId: string) => Note[];
  addNote: (note: Omit<Note, "id">) => Note;

  // Appointments
  appointments: Appointment[];
  addAppointment: (apt: Omit<Appointment, "id">) => Appointment;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => void;
  getPatientAppointments: (patientId: string) => Appointment[];
  getUpcomingAppointments: () => Appointment[];

  // Chat
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  startChatSession: (patientId?: string) => string;
  addChatMessage: (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => void;
  getChatSession: (sessionId: string) => ChatSession | undefined;
  attachChatToPatient: (sessionId: string, patientId: string) => void;

  // Patient Portal
  appointmentRequests: AppointmentRequest[];
  labAIInsights: LabAIInsight[];
  consultationReminders: ConsultationReminder[];
  addAppointmentRequest: (req: Omit<AppointmentRequest, "id" | "createdAt" | "status">) => AppointmentRequest;
  getPatientAppointmentRequests: (patientId: string) => AppointmentRequest[];
  getLabAIInsight: (labResultId: string) => LabAIInsight | undefined;
  generateLabAIInsight: (labResultId: string, patientId: string) => LabAIInsight;
  getPatientReminders: (patientId: string) => ConsultationReminder[];
  dismissReminder: (reminderId: string) => void;
}

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "d001",
    name: "Dr. Emily Carter",
    email: "doctor@medkit.com",
    specialty: "Nephrology",
    licenseNumber: "MD-4821",
    department: "Internal Medicine",
    phone: "+1 (555) 100-0001",
    doctorRole: "specialist_doctor",
    createdAt: "2024-01-10T08:00:00.000Z",
  },
  {
    id: "d002",
    name: "Dr. Michael Torres",
    email: "dr.torres@medkit.com",
    specialty: "Urology",
    licenseNumber: "MD-3390",
    department: "Urology",
    phone: "+1 (555) 100-0002",
    doctorRole: "specialist_doctor",
    createdAt: "2024-02-15T08:00:00.000Z",
  },
  {
    id: "d003",
    name: "Dr. Sarah Lin",
    email: "lab@medkit.com",
    specialty: "Clinical Pathology",
    licenseNumber: "LAB-0012",
    department: "Laboratory",
    phone: "+1 (555) 100-0003",
    doctorRole: "lab_doctor",
    createdAt: "2024-03-01T08:00:00.000Z",
  },
];

const DEMO_USERS: User[] = [
  { id: "u001", email: "doctor@medkit.com", name: "Dr. Emily Carter", role: "specialist_doctor", doctorId: "d001" },
  { id: "u002", email: "admin@medkit.com", name: "Admin User", role: "admin" },
  { id: "u003", email: "dr.torres@medkit.com", name: "Dr. Michael Torres", role: "specialist_doctor", doctorId: "d002" },
  { id: "u010", email: "lab@medkit.com", name: "Dr. Sarah Lin", role: "lab_doctor", doctorId: "d003" },
  // Patient accounts — each linked to a Patient record
  { id: "u004", email: "james.harrison@email.com", name: "James Harrison", role: "patient", patientId: "p001" },
  { id: "u005", email: "maria.santos@email.com", name: "Maria Santos", role: "patient", patientId: "p002" },
  { id: "u006", email: "robert.chen@email.com", name: "Robert Chen", role: "patient", patientId: "p003" },
  { id: "u007", email: "susan.mitchell@email.com", name: "Susan Mitchell", role: "patient", patientId: "p004" },
  { id: "u008", email: "david.park@email.com", name: "David Park", role: "patient", patientId: "p005" },
  { id: "u009", email: "linda.johnson@email.com", name: "Linda Johnson", role: "patient", patientId: "p006" },
];

const DEMO_PASSWORD = "MedKit2025!";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      rememberMe: false,

      login: (email, password, remember) => {
        const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (user && password === DEMO_PASSWORD) {
          set({ user, isAuthenticated: true, rememberMe: remember });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      // Doctors
      doctors: INITIAL_DOCTORS,

      addDoctor: (doctorData) => {
        const newDoctor: Doctor = {
          ...doctorData,
          id: generateId("d"),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ doctors: [...state.doctors, newDoctor] }));
        return newDoctor;
      },

      updateDoctor: (id, updates) => {
        set((state) => ({
          doctors: state.doctors.map((d) => d.id === id ? { ...d, ...updates } : d),
        }));
      },

      deleteDoctor: (id) => {
        set((state) => ({ doctors: state.doctors.filter((d) => d.id !== id) }));
      },

      getDoctor: (id) => {
        return get().doctors.find((d) => d.id === id);
      },

      // Patients
      patients: MOCK_PATIENTS,

      addPatient: (patientData) => {
        const newPatient: Patient = {
          ...patientData,
          id: generateId("p"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ patients: [...state.patients, newPatient] }));
        return newPatient;
      },

      updatePatient: (id, updates) => {
        set((state) => ({
          patients: state.patients.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePatient: (id) => {
        set((state) => ({ patients: state.patients.filter((p) => p.id !== id) }));
      },

      getPatient: (id) => {
        return get().patients.find((p) => p.id === id);
      },

      // Medical Records
      medicalRecords: MOCK_MEDICAL_RECORDS,

      addMedicalRecord: (recordData) => {
        const newRecord: MedicalRecord = {
          ...recordData,
          id: generateId("mr"),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ medicalRecords: [...state.medicalRecords, newRecord] }));
        return newRecord;
      },

      getMedicalRecords: (patientId) => {
        return get()
          .medicalRecords.filter((r) => r.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      // Lab Results
      labResults: MOCK_LAB_RESULTS,

      getLabResults: (patientId) => {
        return get()
          .labResults.filter((r) => r.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      addLabResult: (resultData) => {
        const newResult: LabResult = { ...resultData, id: generateId("lr") };
        set((state) => ({ labResults: [...state.labResults, newResult] }));
        return newResult;
      },

      // Notes
      notes: MOCK_NOTES,

      getNotes: (patientId) => {
        return get()
          .notes.filter((n) => n.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      addNote: (noteData) => {
        const newNote: Note = { ...noteData, id: generateId("n") };
        set((state) => ({ notes: [...state.notes, newNote] }));
        return newNote;
      },

      // Appointments
      appointments: MOCK_APPOINTMENTS,

      addAppointment: (aptData) => {
        const newApt: Appointment = { ...aptData, id: generateId("apt") };
        set((state) => ({ appointments: [...state.appointments, newApt] }));
        return newApt;
      },

      updateAppointmentStatus: (id, status) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        }));
      },

      getPatientAppointments: (patientId) => {
        return get()
          .appointments.filter((a) => a.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getUpcomingAppointments: () => {
        const now = new Date();
        return get()
          .appointments.filter((a) => new Date(a.date) >= now && a.status === "Scheduled")
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
      },

      // Chat
      chatSessions: [],
      currentSessionId: null,

      startChatSession: (patientId) => {
        const sessionId = generateId("session");
        const newSession: ChatSession = {
          id: sessionId,
          patientId,
          messages: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          chatSessions: [...state.chatSessions, newSession],
          currentSessionId: sessionId,
        }));
        return sessionId;
      },

      addChatMessage: (sessionId, messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: generateId("msg"),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
          ),
        }));
      },

      getChatSession: (sessionId) => {
        return get().chatSessions.find((s) => s.id === sessionId);
      },

      attachChatToPatient: (sessionId, patientId) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, patientId } : s
          ),
        }));
      },

      // ── Patient Portal ──────────────────────────────────────────────────
      appointmentRequests: MOCK_APPOINTMENT_REQUESTS,
      labAIInsights: MOCK_LAB_AI_INSIGHTS,
      consultationReminders: MOCK_CONSULTATION_REMINDERS,

      addAppointmentRequest: (reqData) => {
        const newReq: AppointmentRequest = {
          ...reqData,
          id: generateId("ar"),
          status: "Pending",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ appointmentRequests: [...state.appointmentRequests, newReq] }));
        return newReq;
      },

      getPatientAppointmentRequests: (patientId) => {
        return get()
          .appointmentRequests.filter((r) => r.patientId === patientId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getLabAIInsight: (labResultId) => {
        return get().labAIInsights.find((i) => i.labResultId === labResultId);
      },

      generateLabAIInsight: (labResultId, patientId) => {
        const existing = get().labAIInsights.find((i) => i.labResultId === labResultId);
        if (existing) return existing;
        const labResult = get().labResults.find((r) => r.id === labResultId);
        const isAbnormal = labResult?.status === "Abnormal";
        const isCritical = labResult?.status === "Critical";
        const urgency = isCritical ? "Urgent" : isAbnormal ? "Consult Doctor" : "Normal";
        const insight: LabAIInsight = {
          id: generateId("ins"),
          labResultId,
          patientId,
          generatedAt: new Date().toISOString(),
          urgency,
          summary: isCritical
            ? `Your ${labResult?.testName} result is critically outside the normal range and requires prompt medical attention.`
            : isAbnormal
            ? `Your ${labResult?.testName} result is outside the normal reference range. Please discuss this with your doctor at your next appointment.`
            : `Your ${labResult?.testName} result is within the normal reference range. No immediate action is required.`,
          findings: [
            `Result: ${labResult?.result} ${labResult?.unit}`,
            `Reference range: ${labResult?.referenceRange}`,
            `Status: ${labResult?.status}`,
            labResult?.notes ? `Note: ${labResult.notes}` : null,
          ].filter(Boolean) as string[],
          recommendations: isCritical
            ? ["Contact your doctor immediately", "Do not ignore this result", "Seek urgent consultation"]
            : isAbnormal
            ? ["Schedule a follow-up appointment", "Bring this result to your next visit", "Avoid self-medicating based on lab results"]
            : ["Continue your current health routine", "Schedule your next routine check-up", "Maintain a healthy lifestyle"],
          disclaimer: "This AI-generated insight is for informational purposes only and does not constitute medical advice. Always consult your doctor before making any health decisions.",
        };
        set((state) => ({ labAIInsights: [...state.labAIInsights, insight] }));
        return insight;
      },

      getPatientReminders: (patientId) => {
        return get()
          .consultationReminders.filter((r) => r.patientId === patientId && !r.dismissed)
          .sort((a, b) => {
            const p = { high: 0, medium: 1, low: 2 };
            return p[a.priority] - p[b.priority];
          });
      },

      dismissReminder: (reminderId) => {
        set((state) => ({
          consultationReminders: state.consultationReminders.map((r) =>
            r.id === reminderId ? { ...r, dismissed: true } : r
          ),
        }));
      },
    }),
    {
      name: "medkit-storage",
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          // Add prescribedDrugs to any old records that lack it
          if (Array.isArray(state.medicalRecords)) {
            state.medicalRecords = (state.medicalRecords as Array<Record<string, unknown>>).map((r) => ({
              ...r,
              prescribedDrugs: Array.isArray(r.prescribedDrugs) ? r.prescribedDrugs : [],
              vitalSigns: r.vitalSigns ?? {},
            }));
          }
          // Reset portal data to fresh mock data on migration
          state.appointmentRequests = state.appointmentRequests ?? [];
          state.labAIInsights = state.labAIInsights ?? [];
          state.consultationReminders = state.consultationReminders ?? [];
        }
        if (version < 3) {
          // Migrate old "doctor" roles to "specialist_doctor"
          if (state.user && typeof state.user === "object") {
            const u = state.user as Record<string, unknown>;
            if (u.role === "doctor") u.role = "specialist_doctor";
          }
          // Seed doctors list if not present
          state.doctors = state.doctors ?? INITIAL_DOCTORS;
        }
        return state;
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
        doctors: state.doctors,
        patients: state.patients,
        medicalRecords: state.medicalRecords,
        labResults: state.labResults,
        notes: state.notes,
        appointments: state.appointments,
        chatSessions: state.chatSessions,
        appointmentRequests: state.appointmentRequests,
        labAIInsights: state.labAIInsights,
        consultationReminders: state.consultationReminders,
      }),
    }
  )
);
