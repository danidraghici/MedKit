import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Patient, MedicalRecord, LabResult, LabRequest, LabRequestStatus, Note, Appointment,
  ChatSession, ChatMessage, User, AppointmentRequest, LabAIInsight, ConsultationReminder,
  Doctor, DoctorRole, Department, DoctorScheduleEntry, CreateScheduleEntryPayload,
  UserNotification, DoctorProfileStats,
} from "./types";
import { api, configureApiClient } from "./api";
import {
  MOCK_PATIENTS,
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
  accessToken: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;

  // Doctors (managed by admin)
  doctors: Doctor[];
  fetchDoctors: () => Promise<void>;
  addDoctor: (doctor: Omit<Doctor, "id" | "createdAt">) => Doctor;
  updateDoctor: (id: string, updates: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;
  getDoctor: (id: string) => Doctor | undefined;

  // Departments (managed by admin)
  departments: Department[];
  fetchDepartments: () => Promise<void>;
  addDepartmentLocal: (dept: Department) => void;
  updateDepartmentLocal: (id: string, updates: Partial<Department>) => void;

  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;
  fetchPatients: () => Promise<void>;

  // Medical Records
  medicalRecords: MedicalRecord[];
  fetchMedicalRecords: (patientId: string) => Promise<void>;
  addMedicalRecord: (record: Omit<MedicalRecord, "id" | "createdAt">) => Promise<MedicalRecord>;
  updateMedicalRecord: (id: string, data: Omit<MedicalRecord, "id" | "patientId" | "doctorId" | "doctor" | "date" | "createdAt" | "attachments">) => Promise<MedicalRecord>;
  getMedicalRecords: (patientId: string) => MedicalRecord[];

  // Lab Results
  labResults: LabResult[];
  fetchAllLabResults: () => Promise<void>;
  fetchLabResults: (patientId: string) => Promise<void>;
  getLabResults: (patientId: string) => LabResult[];
  uploadLabResult: (patientId: string, file: File) => Promise<LabResult>;
  getLabResultDownloadUrl: (labResultId: string) => Promise<string>;

  // Lab Requests
  labRequests: LabRequest[];
  labRequestUnreadCount: number;
  fetchLabRequests: () => Promise<void>;
  fetchLabRequestsByPatient: (patientId: string) => Promise<void>;
  updateLabRequestStatus: (id: string, status: LabRequestStatus) => Promise<void>;
  markLabRequestRead: (id: string) => Promise<void>;
  submitLabResult: (requestId: string, observations: string | undefined, file: File | undefined) => Promise<void>;
  fetchUnreadLabRequestCount: () => Promise<void>;

  // Notes
  notes: Note[];
  fetchNotes: (patientId: string) => Promise<void>;
  getNotes: (patientId: string) => Note[];
  addNote: (patientId: string, content: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Appointments
  appointments: Appointment[];
  setAppointments: (apts: Appointment[]) => void;
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

  // Doctor Schedule
  schedulePendingCount: number;
  fetchSchedulePendingCount: (doctorId: string) => Promise<void>;
  fetchDoctorSchedule: (doctorId: string) => Promise<DoctorScheduleEntry[]>;
  fetchPendingScheduleEntries: (doctorId: string) => Promise<DoctorScheduleEntry[]>;
  createScheduleEntry: (doctorId: string, payload: CreateScheduleEntryPayload) => Promise<DoctorScheduleEntry>;
  updateScheduleEntry: (doctorId: string, entryId: string, payload: CreateScheduleEntryPayload) => Promise<DoctorScheduleEntry>;
  deleteScheduleEntry: (doctorId: string, entryId: string) => Promise<void>;
  approveScheduleEntry: (doctorId: string, entryId: string) => Promise<DoctorScheduleEntry>;
  rejectScheduleEntry: (doctorId: string, entryId: string) => Promise<void>;

  // User Notifications
  notifications: UserNotification[];
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadNotificationCount: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Doctor Profile Stats
  doctorStats: DoctorProfileStats | null;
  fetchDoctorStats: () => Promise<void>;
}

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
      accessToken: null,

      login: async (email, password, remember) => {
        try {
          const data = await api.post<{ accessToken: string; user: User }>(
            "/api/auth/login",
            { email, password, remember }
          );
          set({ user: data.user, isAuthenticated: true, rememberMe: remember, accessToken: data.accessToken });
          return true;
        } catch {
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } catch {
          // Clear local state regardless of network failure
        }
        set({ user: null, isAuthenticated: false, accessToken: null });
      },

      initAuth: async () => {
        try {
          const data = await api.post<{ accessToken: string; user: User }>("/api/auth/refresh");
          set({ user: data.user, isAuthenticated: true, accessToken: data.accessToken });
        } catch {
          set({ user: null, isAuthenticated: false, accessToken: null });
        }
      },

      // Departments
      departments: [],

      fetchDepartments: async () => {
        try {
          const data = await api.get<Department[]>("/api/departments");
          set({ departments: data });
        } catch {
          // silently keep existing state
        }
      },

      addDepartmentLocal: (dept) => {
        set((state) => ({ departments: [...state.departments, dept] }));
      },

      updateDepartmentLocal: (id, updates) => {
        set((state) => ({
          departments: state.departments.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }));
      },

      // Doctors
      doctors: [],

      fetchDoctors: async () => {
        try {
          const data = await api.get<Doctor[]>("/api/dashboard/staff");
          set({ doctors: data });
        } catch {
          // silently keep whatever is in state
        }
      },

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

      addPatient: async (patientData) => {
        const { user } = get();
        if (user?.role === "admin" || user?.role === "specialist_doctor") {
          const created = await api.post<Patient>("/api/patients", patientData);
          set((state) => ({ patients: [...state.patients, created] }));
          return created;
        }
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

      fetchPatients: async () => {
        try {
          const data = await api.get<Patient[]>("/api/patients/my");
          set({ patients: data });
        } catch {
          // Silently fall back — local mock/persisted data remains in place
        }
      },

      // Medical Records
      medicalRecords: [],

      fetchMedicalRecords: async (patientId) => {
        const data = await api.get<MedicalRecord[]>(`/api/medical-records/patient/${patientId}`);
        const normalizedId = patientId.toLowerCase();
        set((state) => ({
          medicalRecords: [
            ...state.medicalRecords.filter((r) => r.patientId.toLowerCase() !== normalizedId),
            ...data,
          ],
        }));
      },

      addMedicalRecord: async (recordData) => {
        const payload = {
          patientId: recordData.patientId,
          date: recordData.date,
          visitType: recordData.visitType,
          chiefComplaint: recordData.chiefComplaint,
          diagnosis: recordData.diagnosis,
          icdCode: recordData.icdCode,
          secondaryDiagnoses: recordData.secondaryDiagnoses,
          symptoms: recordData.symptoms,
          physicalExam: recordData.physicalExam,
          treatment: recordData.treatment,
          procedures: recordData.procedures,
          urgency: recordData.urgency,
          followUpIn: recordData.followUpIn,
          followUpType: recordData.followUpType,
          referral: recordData.referral,
          patientEducation: recordData.patientEducation,
          sampleTypes: recordData.sampleTypes,
          labRequestNotes: recordData.labRequestNotes,
          vitalSigns: recordData.vitalSigns ? {
            bloodPressure: recordData.vitalSigns.bloodPressure,
            heartRate: recordData.vitalSigns.heartRate,
            temperature: recordData.vitalSigns.temperature,
            respiratoryRate: recordData.vitalSigns.respiratoryRate,
            oxygenSaturation: recordData.vitalSigns.oxygenSaturation,
            weight: recordData.vitalSigns.weight,
            height: recordData.vitalSigns.height,
          } : undefined,
          prescribedDrugs: (recordData.prescribedDrugs ?? []).map((d) => ({
            name: d.name,
            genericName: d.genericName,
            dose: d.dose,
            route: d.route,
            frequency: d.frequency,
            duration: d.duration,
            quantity: d.quantity,
            refills: d.refills,
            instructions: d.instructions,
            indication: d.indication,
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        };
        const data = await api.post<MedicalRecord>("/api/medical-records", payload);
        set((state) => ({ medicalRecords: [...state.medicalRecords, data] }));
        return data;
      },

      updateMedicalRecord: async (id, recordData) => {
        const payload = {
          visitType: recordData.visitType,
          chiefComplaint: recordData.chiefComplaint,
          diagnosis: recordData.diagnosis,
          icdCode: recordData.icdCode,
          secondaryDiagnoses: recordData.secondaryDiagnoses,
          symptoms: recordData.symptoms,
          physicalExam: recordData.physicalExam,
          treatment: recordData.treatment,
          procedures: recordData.procedures,
          urgency: recordData.urgency,
          followUpIn: recordData.followUpIn,
          followUpType: recordData.followUpType,
          referral: recordData.referral,
          patientEducation: recordData.patientEducation,
          sampleTypes: recordData.sampleTypes,
          labRequestNotes: recordData.labRequestNotes,
          vitalSigns: recordData.vitalSigns ? {
            bloodPressure: recordData.vitalSigns.bloodPressure,
            heartRate: recordData.vitalSigns.heartRate,
            temperature: recordData.vitalSigns.temperature,
            respiratoryRate: recordData.vitalSigns.respiratoryRate,
            oxygenSaturation: recordData.vitalSigns.oxygenSaturation,
            weight: recordData.vitalSigns.weight,
            height: recordData.vitalSigns.height,
          } : undefined,
          prescribedDrugs: (recordData.prescribedDrugs ?? []).map((d) => ({
            name: d.name,
            genericName: d.genericName,
            dose: d.dose,
            route: d.route,
            frequency: d.frequency,
            duration: d.duration,
            quantity: d.quantity,
            refills: d.refills,
            instructions: d.instructions,
            indication: d.indication,
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        };
        const data = await api.put<MedicalRecord>(`/api/medical-records/${id}`, payload);
        set((state) => ({
          medicalRecords: state.medicalRecords.map((r) => r.id === id ? data : r),
        }));
        return data;
      },

      getMedicalRecords: (patientId) => {
        const id = patientId.toLowerCase();
        return get()
          .medicalRecords.filter((r) => r.patientId.toLowerCase() === id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      // Lab Results
      labResults: [],

      fetchAllLabResults: async () => {
        try {
          const data = await api.get<LabResult[]>("/api/lab-results");
          set({ labResults: data });
        } catch {
          // silently keep existing state
        }
      },

      fetchLabResults: async (patientId) => {
        try {
          const data = await api.get<LabResult[]>(`/api/patients/${patientId}/lab-results`);
          set((state) => ({
            labResults: [
              ...state.labResults.filter((r) => r.patientId !== patientId),
              ...data,
            ],
          }));
        } catch {
          // silently keep existing state
        }
      },

      getLabResults: (patientId) => {
        return get()
          .labResults.filter((r) => r.patientId === patientId)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      },

      uploadLabResult: async (patientId, file) => {
        const formData = new FormData();
        formData.append("file", file);
        const data = await api.postFile<LabResult>(`/api/patients/${patientId}/lab-results`, formData);
        set((state) => ({ labResults: [...state.labResults, data] }));
        return data;
      },

      getLabResultDownloadUrl: async (labResultId) => {
        const blob = await api.getFile(`/api/lab-results/${labResultId}/file`);
        return URL.createObjectURL(blob);
      },

      // Lab Requests
      labRequests: [],
      labRequestUnreadCount: 0,

      fetchLabRequests: async () => {
        try {
          const data = await api.get<LabRequest[]>("/api/lab-requests");
          set({ labRequests: data });
        } catch {
          // silently keep existing state
        }
      },

      fetchLabRequestsByPatient: async (patientId) => {
        try {
          const data = await api.get<LabRequest[]>(`/api/lab-requests/patient/${patientId}`);
          set((state) => ({
            labRequests: [
              ...state.labRequests.filter((r) => r.patientId !== patientId),
              ...data,
            ],
          }));
        } catch {
          // silently keep existing state
        }
      },

      updateLabRequestStatus: async (id, status) => {
        const data = await api.patch<LabRequest>(`/api/lab-requests/${id}/status`, { status });
        set((state) => ({
          labRequests: state.labRequests.map((r) => r.id === id ? data : r),
        }));
      },

      markLabRequestRead: async (id) => {
        try {
          await api.patch(`/api/lab-requests/${id}/mark-read`, undefined);
          set((state) => ({
            labRequests: state.labRequests.map((r) =>
              r.id === id ? { ...r, viewedByLabAt: new Date().toISOString() } : r
            ),
            labRequestUnreadCount: Math.max(0, state.labRequestUnreadCount - 1),
          }));
        } catch {
          // silently ignore
        }
      },

      submitLabResult: async (requestId, observations, file) => {
        const formData = new FormData();
        if (observations) formData.append("observations", observations);
        if (file) formData.append("file", file);
        const data = await api.postFile<LabRequest>(`/api/lab-requests/${requestId}/results`, formData);
        set((state) => ({
          labRequests: state.labRequests.map((r) => r.id === requestId ? data : r),
          labRequestUnreadCount: Math.max(0, state.labRequestUnreadCount - 1),
        }));
      },

      fetchUnreadLabRequestCount: async () => {
        try {
          const data = await api.get<{ count: number }>("/api/lab-requests/unread-count");
          set({ labRequestUnreadCount: data.count });
        } catch {
          // silently ignore
        }
      },

      // Notes
      notes: [],

      fetchNotes: async (patientId) => {
        try {
          const data = await api.get<Array<{ id: string; patientId: string; authorId: string; authorName: string; noteDate: string; content: string }>>(`/api/notes/patient/${patientId}`);
          const mapped: Note[] = data.map((n) => ({
            id: n.id,
            patientId: n.patientId,
            authorId: n.authorId,
            date: n.noteDate,
            author: n.authorName,
            content: n.content,
          }));
          set((state) => ({
            notes: [
              ...state.notes.filter((n) => n.patientId !== patientId),
              ...mapped,
            ],
          }));
        } catch {
          // silently keep existing state
        }
      },

      getNotes: (patientId) => {
        return get()
          .notes.filter((n) => n.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      addNote: async (patientId, content) => {
        const data = await api.post<{ id: string; patientId: string; authorId: string; authorName: string; noteDate: string; content: string }>(
          "/api/notes",
          { patientId, content }
        );
        const note: Note = {
          id: data.id,
          patientId: data.patientId,
          authorId: data.authorId,
          date: data.noteDate,
          author: data.authorName,
          content: data.content,
        };
        set((state) => ({ notes: [...state.notes, note] }));
        return note;
      },

      updateNote: async (id, content) => {
        await api.put(`/api/notes/${id}`, { content });
        set((state) => ({
          notes: state.notes.map((n) => n.id === id ? { ...n, content } : n),
        }));
      },

      deleteNote: async (id) => {
        await api.delete(`/api/notes/${id}`);
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
      },

      // Appointments
      appointments: MOCK_APPOINTMENTS,

      setAppointments: (apts) => set({ appointments: apts }),

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
        const insight: LabAIInsight = {
          id: generateId("ins"),
          labResultId,
          patientId,
          generatedAt: new Date().toISOString(),
          urgency: "Consult Doctor",
          summary: `Lab report "${labResult?.originalFileName ?? "uploaded file"}" has been received. Please consult your doctor for a detailed interpretation of your results.`,
          findings: [
            `File: ${labResult?.originalFileName ?? "Lab report"}`,
            `Uploaded: ${labResult?.uploadedAt ? new Date(labResult.uploadedAt).toLocaleDateString() : "Recently"}`,
            `Uploaded by: ${labResult?.uploaderName ?? "Lab specialist"}`,
          ],
          recommendations: [
            "Review the lab report with your doctor at your next appointment",
            "Do not self-diagnose based on lab reports",
            "Contact your care team if you have questions about your results",
          ],
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

      // Doctor Schedule
      schedulePendingCount: 0,

      fetchSchedulePendingCount: async (doctorId) => {
        try {
          const data = await api.get<{ count: number }>(
            `/api/doctors/${doctorId}/schedule/pending-count`
          );
          set({ schedulePendingCount: data.count });
        } catch {
          // silent — badge stays at last known count
        }
      },

      fetchDoctorSchedule: async (doctorId) => {
        return api.get<DoctorScheduleEntry[]>(`/api/doctors/${doctorId}/schedule`);
      },

      fetchPendingScheduleEntries: async (doctorId) => {
        return api.get<DoctorScheduleEntry[]>(`/api/doctors/${doctorId}/schedule/pending`);
      },

      createScheduleEntry: async (doctorId, payload) => {
        return api.post<DoctorScheduleEntry>(`/api/doctors/${doctorId}/schedule`, payload);
      },

      updateScheduleEntry: async (doctorId, entryId, payload) => {
        return api.put<DoctorScheduleEntry>(`/api/doctors/${doctorId}/schedule/${entryId}`, payload);
      },

      deleteScheduleEntry: async (doctorId, entryId) => {
        await api.delete(`/api/doctors/${doctorId}/schedule/${entryId}`);
      },

      approveScheduleEntry: async (doctorId, entryId) => {
        return api.post<DoctorScheduleEntry>(
          `/api/doctors/${doctorId}/schedule/${entryId}/approve`
        );
      },

      rejectScheduleEntry: async (doctorId, entryId) => {
        await api.post(`/api/doctors/${doctorId}/schedule/${entryId}/reject`);
      },

      // User Notifications
      notifications: [],
      unreadNotificationCount: 0,

      fetchNotifications: async () => {
        try {
          const data = await api.get<UserNotification[]>("/api/notifications");
          set({ notifications: data });
        } catch {
          // silently keep existing state
        }
      },

      fetchUnreadNotificationCount: async () => {
        try {
          const data = await api.get<{ count: number }>("/api/notifications/count");
          set({ unreadNotificationCount: data.count });
        } catch {
          // silent — badge stays at last known count
        }
      },

      markNotificationRead: async (id) => {
        try {
          const updated = await api.put<UserNotification>(`/api/notifications/${id}/read`);
          set((state) => ({
            notifications: state.notifications.map((n) => n.id === id ? updated : n),
            unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
          }));
        } catch {
          // silently ignore
        }
      },

      markAllNotificationsRead: async () => {
        try {
          await api.put("/api/notifications/read-all");
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadNotificationCount: 0,
          }));
        } catch {
          // silently ignore
        }
      },

      // Doctor Profile Stats
      doctorStats: null,
      fetchDoctorStats: async () => {
        try {
          const data = await api.get<DoctorProfileStats>("/api/appointments/profile-stats");
          set({ doctorStats: data });
        } catch {
          // silently ignore — UI keeps showing "—"
        }
      },
    }),
    {
      name: "medkit-storage",
      version: 8,
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
        }
        if (version < 5) {
          // Doctors are now fetched from the API; clear any persisted mock data
          state.doctors = [];
        }
        if (version < 6) {
          state.departments = [];
        }
        if (version < 7) {
          state.labRequests = [];
          state.labRequestUnreadCount = 0;
        }
        if (version < 8) {
          // notifications are always fetched fresh — initialize to empty
          state.notifications = [];
          state.unreadNotificationCount = 0;
        }
        return state;
      },
      partialize: (state) => ({
        // Auth state is NOT persisted — sessions are managed via httpOnly cookies.
        // accessToken lives in memory only; user is rehydrated via initAuth() on mount.
        // doctors, labResults, and labRequests are NOT persisted — always fetched fresh from the API.
        patients: state.patients,
        medicalRecords: state.medicalRecords,
        // notes, labResults, and labRequests are always fetched fresh from the API — not persisted
        appointments: state.appointments,
        chatSessions: state.chatSessions,
        appointmentRequests: state.appointmentRequests,
        labAIInsights: state.labAIInsights,
        consultationReminders: state.consultationReminders,
      }),
    }
  )
);

// Wire up the API client with the store's token getter and silent refresh function.
// Must run after useAppStore is created.
configureApiClient({
  getToken: () => useAppStore.getState().accessToken,
  refresh: async () => {
    try {
      const data = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Refresh failed");
        return r.json() as Promise<{ accessToken: string; user: User }>;
      });
      useAppStore.setState({ accessToken: data.accessToken, user: data.user, isAuthenticated: true });
      return true;
    } catch {
      useAppStore.setState({ accessToken: null, user: null, isAuthenticated: false });
      return false;
    }
  },
});
