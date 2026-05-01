import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  CalendarDays,
  FileText,
  UserPlus,
  Clock,
  TrendingUp,
  Stethoscope,
  AlertCircle,
  Plus,
  FlaskConical,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Droplets,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Building2,
  Award,
  CheckCircle2,
  XCircle,
  User,
  Filter,
  CalendarCheck,
  AlertTriangle,
  Activity,
  ClipboardList,
  Loader2,
  Upload,
} from "lucide-react";
import { KPI } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate, calculateAge, getInitials } from "@/lib/utils";
import type {
  Patient,
  BloodType,
  Sex,
  Doctor,
  DoctorRole,
  Appointment,
  DashboardStats,
  DoctorSummary,
} from "@/lib/types";

// ─── Patient form schema ──────────────────────────────────────────────────────
const patientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().min(1, "National ID is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]),
  allergies: z.string(),
  currentMedications: z.string(),
});
type PatientFormData = z.infer<typeof patientSchema>;

// ─── Doctor form schema ───────────────────────────────────────────────────────
const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  specialty: z.string().min(2, "Specialty is required"),
  licenseNumber: z.string().min(2, "License number is required"),
  department: z.string().min(2, "Department is required"),
  phone: z.string().min(7, "Phone number is required"),
  doctorRole: z.enum(["specialist_doctor", "lab_doctor"]),
});
type DoctorFormData = z.infer<typeof doctorSchema>;

const PATIENT_PAGE_SIZE = 8;

const roleConfig: Record<DoctorRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  specialist_doctor: {
    label: "Medic specialist",
    icon: <Stethoscope className="w-4 h-4" />,
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
    description: "Poate adăuga pacienți, crea programări, adăuga note și gestiona medicamentele.",
  },
  lab_doctor: {
    label: "Medic laborator",
    icon: <FlaskConical className="w-4 h-4" />,
    color:
      "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800",
    description: "Poate doar încărca și gestiona rezultatele de laborator ale pacienților.",
  },
};

const statusConfig: Record<Appointment["status"], { label: string; icon: React.ReactNode; className: string }> = {
  Scheduled: {
    label: "Programat",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    className: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  },
  Completed: {
    label: "Finalizat",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  },
  Cancelled: {
    label: "Anulat",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "text-muted-foreground bg-muted border-border",
  },
};

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  initialTab?: string;
}

export default function DashboardPage({ onNavigate, initialTab }: DashboardPageProps) {
  const patients = useAppStore((s) => s.patients);
  const addPatient = useAppStore((s) => s.addPatient);
  const updatePatient = useAppStore((s) => s.updatePatient);
  const deletePatient = useAppStore((s) => s.deletePatient);
  const medicalRecords = useAppStore((s) => s.medicalRecords);
  const labResults = useAppStore((s) => s.labResults);
  const appointments = useAppStore((s) => s.appointments);
  const doctors = useAppStore((s) => s.doctors);
  const addDoctor = useAppStore((s) => s.addDoctor);
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const deleteDoctor = useAppStore((s) => s.deleteDoctor);
  const user = useAppStore((s) => s.user);
  const fetchPatients = useAppStore((s) => s.fetchPatients);
  const fetchAllLabResults = useAppStore((s) => s.fetchAllLabResults);
  const setAppointments = useAppStore((s) => s.setAppointments);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [staffList, setStaffList] = useState<DoctorSummary[] | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [dashboardAppts, setDashboardAppts] = useState<Appointment[]>([]);
  const [apptLoading, setApptLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchPatients();
      void api.get<DashboardStats>("/api/dashboard/stats").then(setDashboardStats).catch(console.error);
      setStaffLoading(true);
      void api
        .get<DoctorSummary[]>("/api/dashboard/staff")
        .then((data) => {
          setStaffList(data);
          setStaffLoading(false);
        })
        .catch((err) => {
          console.error("GET /api/dashboard/staff failed:", err);
          setStaffLoading(false);
        });
    }
    if (user?.role === "specialist_doctor") {
      void fetchPatients();
    }
    if (user?.role === "lab_doctor") {
      void fetchPatients();
      void fetchAllLabResults();
    }
    if (user?.role != null) {
      setApptLoading(true);
      void api
        .get<Appointment[]>("/api/appointments")
        .then((data) => {
          setDashboardAppts(data);
          setAppointments(data);
        })
        .catch(console.error)
        .finally(() => setApptLoading(false));
    }
  }, [user?.role, fetchPatients, fetchAllLabResults, setAppointments]);

  const isAdmin = user?.role === "admin";
  const isLabDoctor = user?.role === "lab_doctor";
  const canManagePatients = user?.role === "admin" || user?.role === "specialist_doctor";
  const canManageDoctors = isAdmin;

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab ?? "overview");

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split("T")[0];
    const isDoctorUser = user?.role === "specialist_doctor" || user?.role === "lab_doctor";
    const currentDoctorId = user?.doctorId?.toLowerCase();
    const recentRecords = medicalRecords.filter(
      (r) =>
        new Date(r.createdAt) >= thirtyDaysAgo &&
        (!isDoctorUser || (!!currentDoctorId && r.doctorId.toLowerCase() === currentDoctorId)),
    );
    const upcomingApts = appointments.filter((a) => new Date(a.date) >= today && a.status === "Scheduled");
    // Lab-specific stats (file-based: no status, use uploadedAt for date filtering)
    const todayResults = labResults.filter((r) => r.uploadedAt.startsWith(todayStr));
    const recentLabResults = [...labResults]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 6);
    const patientsWithLabWork = new Set(labResults.map((r) => r.patientId)).size;
    return {
      totalPatients: patients.length,
      recentRecords: recentRecords.length,
      upcomingAppointments: upcomingApts.length,
      upcomingList: upcomingApts.slice(0, 5),
      // Lab stats
      totalLabResults: labResults.length,
      todayCount: todayResults.length,
      patientsWithLabWork,
      recentLabResults,
      // Upcoming harvests = all upcoming scheduled appointments (lab doctor view)
      upcomingHarvests: upcomingApts,
    };
  }, [patients, medicalRecords, appointments, labResults, user?.role, user?.doctorId]);

  const recentPatients = useMemo(
    () => [...patients].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [patients],
  );

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Bună dimineața" : greetingHour < 17 ? "Bună ziua" : "Bună seara";

  // ────────────────────────────────────────────────────────────────────────────
  // PATIENTS TAB STATE
  // ────────────────────────────────────────────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilterSex, setPatientFilterSex] = useState("all");
  const [patientFilterBlood, setPatientFilterBlood] = useState("all");
  const [patientPage, setPatientPage] = useState(1);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletePatientConfirm, setDeletePatientConfirm] = useState<Patient | null>(null);

  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      sex: "Male",
      bloodType: "Unknown",
      allergies: "",
      currentMedications: "",
    },
  });

  const filteredPatients = useMemo(() => {
    let list = [...patients];
    if (patientSearch) {
      const q = patientSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.nationalId.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q),
      );
    }
    if (patientFilterSex !== "all") list = list.filter((p) => p.sex === patientFilterSex);
    if (patientFilterBlood !== "all") list = list.filter((p) => p.bloodType === patientFilterBlood);
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [patients, patientSearch, patientFilterSex, patientFilterBlood]);

  const totalPatientPages = Math.max(1, Math.ceil(filteredPatients.length / PATIENT_PAGE_SIZE));
  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * PATIENT_PAGE_SIZE,
    patientPage * PATIENT_PAGE_SIZE,
  );

  const openAddPatient = () => {
    setEditingPatient(null);
    patientForm.reset({
      sex: "Male",
      bloodType: "Unknown",
      allergies: "",
      currentMedications: "",
    });
    setIsPatientModalOpen(true);
  };

  const openEditPatient = (p: Patient) => {
    setEditingPatient(p);
    patientForm.reset({
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth,
      sex: p.sex,
      nationalId: p.nationalId,
      phone: p.phone,
      email: p.email,
      bloodType: p.bloodType,
      allergies: p.allergies,
      currentMedications: p.currentMedications,
    });
    setIsPatientModalOpen(true);
  };

  const onPatientSubmit = async (data: PatientFormData) => {
    await new Promise((r) => setTimeout(r, 400));
    if (editingPatient) {
      updatePatient(editingPatient.id, data);
    } else {
      addPatient(data);
    }
    setIsPatientModalOpen(false);
    patientForm.reset();
  };

  // ────────────────────────────────────────────────────────────────────────────
  // DOCTORS TAB STATE
  // ────────────────────────────────────────────────────────────────────────────
  const [doctorSearch, setDoctorSearch] = useState("");
  const [filterDoctorRole, setFilterDoctorRole] = useState("all");
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorSummary | null>(null);
  const [deleteDoctorConfirm, setDeleteDoctorConfirm] = useState<DoctorSummary | null>(null);

  const doctorForm = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { doctorRole: "specialist_doctor" },
  });

  const filteredDoctors = useMemo(() => {
    let list: DoctorSummary[] = [...(staffList ?? doctors)];
    if (doctorSearch) {
      const q = doctorSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q),
      );
    }
    if (filterDoctorRole !== "all") list = list.filter((d) => d.doctorRole === filterDoctorRole);
    return list;
  }, [staffList, doctors, doctorSearch, filterDoctorRole]);

  const openAddDoctor = () => {
    setEditingDoctor(null);
    doctorForm.reset({ doctorRole: "specialist_doctor" });
    setIsDoctorModalOpen(true);
  };

  const openEditDoctor = (d: DoctorSummary) => {
    setEditingDoctor(d);
    doctorForm.reset({
      name: d.name,
      email: d.email,
      specialty: d.specialty,
      licenseNumber: d.licenseNumber,
      department: d.department,
      phone: d.phone,
      doctorRole: d.doctorRole,
    });
    setIsDoctorModalOpen(true);
  };

  const onDoctorSubmit = async (data: DoctorFormData) => {
    await new Promise((r) => setTimeout(r, 400));
    if (editingDoctor) {
      updateDoctor(editingDoctor.id, data);
    } else {
      addDoctor({ ...data, departmentId: "" });
    }
    setIsDoctorModalOpen(false);
    doctorForm.reset();
  };

  // ────────────────────────────────────────────────────────────────────────────
  // APPOINTMENTS TAB STATE
  // ────────────────────────────────────────────────────────────────────────────
  const [apptSearch, setApptSearch] = useState("");
  const [apptFilterStatus, setApptFilterStatus] = useState("all");
  const [apptFilterPeriod, setApptFilterPeriod] = useState("today");

  const handleApptStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/api/appointments/${id}/status`, { status });
      setDashboardAppts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as Appointment["status"] } : a)),
      );
    } catch (err) {
      console.error("Failed to update appointment status:", err);
    }
  };

  const apptStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      total: dashboardAppts.length,
      scheduled: dashboardAppts.filter((a) => a.status === "Scheduled").length,
      today: dashboardAppts.filter((a) => {
        const d = new Date(a.date);
        return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000) && a.status === "Scheduled";
      }).length,
      thisWeek: dashboardAppts.filter((a) => {
        const d = new Date(a.date);
        return d >= today && d < nextWeek && a.status === "Scheduled";
      }).length,
    };
  }, [dashboardAppts]);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let list = [...dashboardAppts];
    if (apptSearch) {
      const q = apptSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.doctor.toLowerCase().includes(q),
      );
    }
    if (apptFilterStatus !== "all") list = list.filter((a) => a.status === apptFilterStatus);
    if (apptFilterPeriod === "today") {
      list = list.filter((a) => {
        const d = new Date(a.date);
        return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      });
    } else if (apptFilterPeriod === "upcoming") {
      list = list.filter((a) => new Date(a.date) >= today);
    } else if (apptFilterPeriod === "past") {
      list = list.filter((a) => new Date(a.date) < today);
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      const nowTs = now.getTime();
      if (da >= nowTs && db >= nowTs) return da - db;
      if (da < nowTs && db < nowTs) return db - da;
      return da >= nowTs ? -1 : 1;
    });
    return list;
  }, [dashboardAppts, apptSearch, apptFilterStatus, apptFilterPeriod]);

  const groupedAppointments = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filteredAppointments.forEach((a) => {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    });
    return Array.from(map.entries());
  }, [filteredAppointments]);

  // ── Tab visibility ─────────────────────────────────────────────────────────
  // Lab doctors see a simplified overview — no doctors tab, no appointments tab
  const showDoctorsTab = isAdmin;
  const showAppointmentsTab = !isLabDoctor;

  return (
    <div className="space-y-6">
      {/* ── Welcome header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user?.name?.split(" ")[0] ?? "Medic"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {formatDate(new Date().toISOString(), "EEEE, dd MMMM yyyy")} —{" "}
            {isAdmin ? "Prezentare generală și management sistem" : "Prezentarea dvs. clinică"}
          </p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      {isLabDoctor ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPI
            label="Total rezultate laborator"
            value={stats.totalLabResults}
            period="Din toate timpurile"
            icon={<FlaskConical className="w-7 h-7" />}
            accent="cerulean"
          />
          <KPI
            label="Încărcate azi"
            value={stats.todayCount}
            period="Fișiere laborator azi"
            icon={<Upload className="w-7 h-7" />}
            accent="orange"
          />
          <KPI
            label="Pacienți cu analize"
            value={stats.patientsWithLabWork}
            period="Au rezultate laborator"
            icon={<Users className="w-7 h-7" />}
            accent="teal"
          />
          <KPI
            label="Recoltări viitoare"
            value={stats.upcomingHarvests.length}
            period="Probe programate"
            icon={<CalendarDays className="w-7 h-7" />}
            accent="cerulean"
          />
        </div>
      ) : (
        <div className={`grid gap-4 ${isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
          <KPI
            label="Total pacienți"
            value={stats.totalPatients}
            period="Din toate timpurile"
            icon={<Users className="w-7 h-7" />}
            accent="cerulean"
          />
          <KPI
            label="Înregistrări recente"
            value={dashboardStats?.recentRecords ?? stats.recentRecords}
            period="Ultimele 30 de zile"
            icon={<FileText className="w-7 h-7" />}
            accent="teal"
          />
          <KPI
            label="Programări viitoare"
            value={dashboardStats?.upcomingAppointments ?? stats.upcomingAppointments}
            period="Următoarele 30 de zile"
            icon={<CalendarDays className="w-7 h-7" />}
            accent="purple"
          />
          {isAdmin && (
            <KPI
              label="Medici"
              value={dashboardStats?.activeDoctors ?? doctors.length}
              period="Personal activ"
              icon={<Stethoscope className="w-7 h-7" />}
              accent="orange"
            />
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Prezentare generală
          </TabsTrigger>
          {!isLabDoctor && (
            <TabsTrigger value="patients" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Pacienți
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {patients.length}
              </Badge>
            </TabsTrigger>
          )}
          {showAppointmentsTab && (
            <TabsTrigger value="appointments" className="gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Programări
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {apptStats.scheduled}
              </Badge>
            </TabsTrigger>
          )}
          {showDoctorsTab && (
            <TabsTrigger value="doctors" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Medici
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {dashboardStats?.activeDoctors ?? doctors.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* ════════════════════════════════════════════════════════════════════
              LAB DOCTOR — unique lab-centric overview (no patient list duplicate)
          ═══════════════════════════════════════════════════════════════════════ */}
          {isLabDoctor && (
            <div className="space-y-6">
              {/* ── Recent Uploads ────────────────────────────────────────────── */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Încărcări recente
                    {stats.todayCount > 0 && (
                      <Badge className="ml-1 bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5">
                        {stats.todayCount} azi
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {stats.recentLabResults.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FlaskConical className="w-9 h-9 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Nu există fișiere de laborator încărcate</p>
                      <p className="text-xs mt-0.5">Încărcați un rezultat de laborator din profilul oricărui pacient</p>
                    </div>
                  ) : (
                    stats.recentLabResults.map((r) => {
                      const patient = patients.find((p) => p.id === r.patientId);
                      return (
                        <div
                          key={r.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-purple-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.originalFileName}</p>
                            <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                              <button
                                onClick={() => patient && onNavigate(`patient-${patient.id}`)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <User className="w-3 h-3" />
                                {patient?.fullName ?? "Pacient necunoscut"}
                              </button>
                              <span className="text-[10px] text-muted-foreground">{formatDate(r.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* ── Upcoming Harvests ─────────────────────────────────────────── */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Recoltări viitoare
                    {stats.upcomingHarvests.length > 0 && (
                      <Badge className="ml-1 bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5">
                        {stats.upcomingHarvests.length} programate
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {stats.upcomingHarvests.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <CalendarDays className="w-9 h-9 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">Nicio recoltare viitoare</p>
                      <p className="text-xs mt-0.5">Toate recoltările programate vor apărea aici</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.upcomingHarvests.map((apt) => {
                        const aptDate = new Date(apt.date);
                        const now = new Date();
                        const isToday = apt.date === now.toISOString().split("T")[0];
                        const isTomorrow = apt.date === new Date(now.getTime() + 86400000).toISOString().split("T")[0];
                        const dayLabel = isToday
                          ? "Azi"
                          : isTomorrow
                            ? "Mâine"
                            : aptDate.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
                        return (
                          <button
                            key={apt.id}
                            onClick={() => onNavigate(`patient-${apt.patientId}`)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                          >
                            {/* Date block */}
                            <div
                              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 text-center ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              <span className="text-[10px] font-medium uppercase leading-none opacity-80">
                                {isToday
                                  ? "Azi"
                                  : isTomorrow
                                    ? "Mâine"
                                    : aptDate.toLocaleDateString("ro-RO", { month: "short" })}
                              </span>
                              {!isToday && !isTomorrow && (
                                <span className="text-lg font-bold leading-tight">{aptDate.getDate()}</span>
                              )}
                              <span
                                className={`text-[10px] leading-none mt-0.5 ${isToday ? "opacity-90" : "text-muted-foreground"}`}
                              >
                                {apt.time}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                {apt.patientName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                                <FlaskConical className="w-3 h-3 shrink-0" />
                                {apt.type}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 shrink-0" />
                                {apt.doctor}
                              </p>
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              <span
                                className={`text-[10px] px-2 py-1 rounded-full border font-medium ${
                                  isToday
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                                }`}
                              >
                                {isToday ? "Azi" : dayLabel}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Two-column: Recent Lab Activity + Workload Summary ─────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Lab Activity */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      Activitate recentă laborator
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate("patients")}>
                      Vezi pacienți
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {stats.recentLabResults.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nu există rezultate de laborator încărcate</p>
                      </div>
                    ) : (
                      stats.recentLabResults.map((r) => {
                        const patient = patients.find((p) => p.id === r.patientId);
                        return (
                          <button
                            key={r.id}
                            onClick={() => patient && onNavigate(`patient-${patient.id}`)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          >
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className="text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                {getInitials(patient?.fullName ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {r.originalFileName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {patient?.fullName ?? "Pacient necunoscut"}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDate(r.uploadedAt)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Workload Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      Rezumat volum de muncă
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total fișiere încărcate</span>
                      <span className="font-semibold">{stats.totalLabResults}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pacienți cu analize</span>
                      <span className="font-semibold">{stats.patientsWithLabWork}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Încărcate azi</span>
                      <span className="font-semibold">{stats.todayCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── HIPAA Notice ──────────────────────────────────────────────── */}
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Notă de conformitate HIPAA
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                    Toate datele pacienților sunt informații de sănătate protejate (PHI) conform reglementărilor HIPAA.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <li>• Accesați doar înregistrările relevante pentru rolul dvs. clinic</li>
                    <li>• Nu partajați datele de autentificare cu alții</li>
                    <li>• Deconectați-vă când părăsiți stațiile de lucru nesupravegheate</li>
                    <li>• Toate accesările sunt auditate și înregistrate</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              ADMIN / SPECIALIST — existing two-column overview
          ═══════════════════════════════════════════════════════════════════════ */}
          {!isLabDoctor && (
            <div className={`grid grid-cols-1 gap-6 ${!isLabDoctor ? "lg:grid-cols-2" : ""}`}>
              {/* ── Recent Patients ───────────────────────────────────────────── */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Pacienți recenți
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveTab("patients")}>
                    Vezi toate
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {recentPatients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Niciun pacient momentan</p>
                    </div>
                  ) : (
                    recentPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => onNavigate(`patient-${patient.id}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      >
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                            {getInitials(patient.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {patient.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {calculateAge(patient.dateOfBirth)} ani · {patient.sex} · {patient.bloodType}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {formatDate(patient.updatedAt)}
                        </Badge>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* ── Right column: Upcoming Appointments (non-admin) or Medical Staff (admin) ── */}
              {!isLabDoctor && isAdmin ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      Personal medical
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveTab("doctors")}>
                      Vezi toate
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {(staffList ?? doctors).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Niciun medic înregistrat</p>
                      </div>
                    ) : (
                      (staffList ?? doctors).slice(0, 5).map((d) => {
                        const cfg = roleConfig[d.doctorRole];
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="w-9 h-9 shrink-0">
                              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                {getInitials(d.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{d.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {d.specialty} · {d.department}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${cfg.color}`}
                            >
                              {cfg.icon}
                              {cfg.label.replace(" Doctor", "")}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      Programări viitoare
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{stats.upcomingAppointments}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setActiveTab("appointments")}
                      >
                        Vezi toate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {stats.upcomingList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nicio programare viitoare</p>
                        {!isLabDoctor && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5"
                            onClick={() => onNavigate("create-appointment")}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Programează una
                          </Button>
                        )}
                      </div>
                    ) : (
                      stats.upcomingList.map((apt) => {
                        const aptPatient = patients.find((p) => p.id === apt.patientId);
                        const isToday = new Date(apt.date).toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={apt.id}
                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            <div
                              className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg shrink-0 text-center ${
                                isToday ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                              }`}
                            >
                              <span className="text-[10px] font-medium leading-none uppercase">
                                {new Date(apt.date).toLocaleDateString("en", { month: "short" })}
                              </span>
                              <span className="text-sm font-bold leading-tight">{new Date(apt.date).getDate()}</span>
                              <span className="text-[9px] leading-none opacity-80">{apt.time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => aptPatient && onNavigate(`patient-${aptPatient.id}`)}
                                className="text-sm font-medium truncate hover:text-primary transition-colors text-left block w-full"
                              >
                                {aptPatient?.fullName ?? "Pacient necunoscut"}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                {apt.doctor}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] shrink-0 ${
                                apt.status === "Completed"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : apt.status === "Cancelled"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}
                            >
                              {apt.status}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── HIPAA Notice ──────────────────────────────────────────────── */}
              <Card
                className={`border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 ${!isLabDoctor ? "lg:col-span-2" : ""}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Notă de conformitate HIPAA
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 mb-2">
                    <p>
                      Toate datele pacienților sunt informații de sănătate protejate (PHI) conform reglementărilor
                      HIPAA.
                    </p>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <li>• Accesați doar înregistrările relevante pentru rolul dvs. clinic</li>
                    <li>• Nu partajați datele de autentificare cu alții</li>
                    <li>• Deconectați-vă când părăsiți stațiile de lucru nesupravegheate</li>
                    <li>• Toate accesările sunt auditate și înregistrate</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── PATIENTS TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="patients" className="space-y-5">
          {/* Patients header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pacienți</h2>
              <p className="text-sm text-muted-foreground">
                {filteredPatients.length} {filteredPatients.length === 1 ? "pacient găsit" : "pacienți găsiți"}
              </p>
            </div>
            {canManagePatients && (
              <Button onClick={() => onNavigate("add-patient")} className="gap-2 sm:w-auto w-full">
                <UserPlus className="w-4 h-4" />
                Adaugă pacient
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Căutați după nume, ID, email sau telefon…"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setPatientPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={patientFilterSex}
              onValueChange={(v) => {
                setPatientFilterSex(v);
                setPatientPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate sexele</SelectItem>
                <SelectItem value="Male">Masculin</SelectItem>
                <SelectItem value="Female">Feminin</SelectItem>
                <SelectItem value="Other">Alt sex</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={patientFilterBlood}
              onValueChange={(v) => {
                setPatientFilterBlood(v);
                setPatientPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Grup sanguin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate grupele sanguine</SelectItem>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient list */}
          {paginatedPatients.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Niciun pacient găsit</EmptyTitle>
                <EmptyDescription>
                  {patientSearch || patientFilterSex !== "all" || patientFilterBlood !== "all"
                    ? "Încercați să ștergeți filtrele."
                    : "Adăugați primul pacient pentru a începe."}
                </EmptyDescription>
              </EmptyHeader>
              {canManagePatients && (
                <EmptyContent>
                  <Button onClick={() => onNavigate("add-patient")} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Adaugă pacient
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getInitials(patient.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{patient.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {calculateAge(patient.dateOfBirth)} ani · {patient.sex}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onNavigate(`patient-${patient.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Vezi dosar
                          </DropdownMenuItem>
                          {canManagePatients && (
                            <>
                              <DropdownMenuItem onClick={() => openEditPatient(patient)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editează pacient
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletePatientConfirm(patient)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Șterge pacient
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{patient.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Droplets className="w-3.5 h-3.5 shrink-0" />
                        <span>Grup sanguin: {patient.bloodType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Actualizat {formatDate(patient.updatedAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => onNavigate(`patient-${patient.id}`)}
                    >
                      Vezi dosar
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPatientPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Se afișează {(patientPage - 1) * PATIENT_PAGE_SIZE + 1}–
                    {Math.min(patientPage * PATIENT_PAGE_SIZE, filteredPatients.length)} din {filteredPatients.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPatientPage((p) => Math.max(1, p - 1))}
                      disabled={patientPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {patientPage} / {totalPatientPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPatientPage((p) => Math.min(totalPatientPages, p + 1))}
                      disabled={patientPage === totalPatientPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── APPOINTMENTS TAB ──────────────────────────────────────────────── */}
        {showAppointmentsTab && (
          <TabsContent value="appointments" className="space-y-5">
            {/* Appointments header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Programări</h2>
                <p className="text-sm text-muted-foreground">
                  {apptStats.scheduled} viitoare · {apptStats.today} azi
                </p>
              </div>
              <Button onClick={() => onNavigate("create-appointment")} className="gap-2 sm:w-auto w-full">
                <Plus className="w-4 h-4" />
                Programează consultație
              </Button>
            </div>

            {/* Appointment KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI
                label="Total"
                value={apptStats.total}
                period="Din toate timpurile"
                icon={<CalendarDays className="w-7 h-7" />}
                accent="cerulean"
              />
              <KPI
                label="Programate"
                value={apptStats.scheduled}
                period="Viitoare"
                icon={<CalendarCheck className="w-7 h-7" />}
                accent="teal"
              />
              <KPI
                label="Astăzi"
                value={apptStats.today}
                period="Astăzi"
                icon={<Clock className="w-7 h-7" />}
                accent="purple"
              />
              <KPI
                label="Această săptămână"
                value={apptStats.thisWeek}
                period="Următoarele 7 zile"
                icon={<Filter className="w-7 h-7" />}
                accent="orange"
              />
            </div>

            {/* Appointment filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Căutați pacient, tip, medic..."
                  value={apptSearch}
                  onChange={(e) => setApptSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={apptFilterStatus} onValueChange={setApptFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Stare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate stările</SelectItem>
                  <SelectItem value="Scheduled">Programat</SelectItem>
                  <SelectItem value="Completed">Finalizat</SelectItem>
                  <SelectItem value="Cancelled">Anulat</SelectItem>
                </SelectContent>
              </Select>
              <Select value={apptFilterPeriod} onValueChange={setApptFilterPeriod}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Perioadă" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate timpurile</SelectItem>
                  <SelectItem value="today">Astăzi</SelectItem>
                  <SelectItem value="upcoming">Viitoare</SelectItem>
                  <SelectItem value="past">Trecute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Appointment list */}
            {apptLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Se încarcă programările…</span>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nicio programare găsită</EmptyTitle>
                  <EmptyDescription>
                    {apptSearch || apptFilterStatus !== "all" || apptFilterPeriod !== "all"
                      ? "Încercați să ștergeți filtrele."
                      : "Programați prima consultație pentru a începe."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => onNavigate("create-appointment")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Programează consultație
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="space-y-6">
                {groupedAppointments.map(([date, apts]) => {
                  const d = new Date(date);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const isToday = d.toDateString() === today.toDateString();
                  const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                  const dayLabel = isToday ? "Azi" : isTomorrow ? "Mâine" : formatDate(date, "EEEE, dd MMMM yyyy");

                  return (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                            isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="text-xs font-bold leading-none">{formatDate(date, "dd")}</span>
                          <span className="text-[10px] leading-none uppercase opacity-80">
                            {formatDate(date, "MMM")}
                          </span>
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isToday ? "text-primary" : ""}`}>{dayLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {apts.length} {apts.length === 1 ? "programare" : "programări"}
                          </p>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <div className="space-y-2.5">
                        {apts.map((apt) => {
                          const sc = statusConfig[apt.status];
                          return (
                            <Card key={apt.id} className="hover:shadow-sm transition-shadow group">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-muted/60 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground mb-0.5" />
                                    <span className="text-sm font-bold">{apt.time}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={() => onNavigate(`patient-${apt.patientId}`)}
                                        className="flex items-center gap-2 group/btn"
                                      >
                                        <Avatar className="w-7 h-7 shrink-0">
                                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                            {getInitials(apt.patientName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-semibold text-sm group-hover/btn:text-primary transition-colors">
                                          {apt.patientName}
                                        </span>
                                      </button>
                                      <span
                                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.className}`}
                                      >
                                        {sc.icon}
                                        {sc.label}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 truncate">{apt.type}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{apt.doctor}</span>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => onNavigate(`patient-${apt.patientId}`)}>
                                        <User className="w-4 h-4 mr-2" />
                                        Vezi dosar pacient
                                      </DropdownMenuItem>
                                      {apt.status !== "Completed" && (
                                        <>
                                          <DropdownMenuSeparator />
                                          {apt.status === "Scheduled" && (
                                            <DropdownMenuItem
                                              onClick={() => handleApptStatusChange(apt.id, "Completed")}
                                            >
                                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                              Marchează ca finalizat
                                            </DropdownMenuItem>
                                          )}
                                          {apt.status === "Scheduled" && (
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onClick={() => handleApptStatusChange(apt.id, "Cancelled")}
                                            >
                                              <XCircle className="w-4 h-4 mr-2" />
                                              Anulează programarea
                                            </DropdownMenuItem>
                                          )}
                                          {apt.status === "Cancelled" && (
                                            <DropdownMenuItem
                                              onClick={() => handleApptStatusChange(apt.id, "Scheduled")}
                                            >
                                              <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                                              Reprogramează
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── DOCTORS TAB (admin only) ───────────────────────────────────────── */}
        {showDoctorsTab && (
          <TabsContent value="doctors" className="space-y-5">
            {/* Doctors header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Personal medical</h2>
                <p className="text-sm text-muted-foreground">
                  {staffLoading
                    ? "Se încarcă din baza de date…"
                    : `${filteredDoctors.length} ${filteredDoctors.length === 1 ? "medic înregistrat" : "medici înregistrați"}${staffList === null ? " (offline)" : ""}`}
                </p>
              </div>
              <Button onClick={() => onNavigate("add-doctor")} className="gap-2 sm:w-auto w-full">
                <UserPlus className="w-4 h-4" />
                Adaugă medic
              </Button>
            </div>

            {/* Role info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.entries(roleConfig) as [DoctorRole, (typeof roleConfig)[DoctorRole]][]).map(([role, cfg]) => (
                <div key={role} className={`rounded-xl border p-3.5 ${cfg.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {cfg.icon}
                    <span className="font-semibold text-sm">{cfg.label}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {(staffList ?? doctors).filter((d) => d.doctorRole === role).length}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80">{cfg.description}</p>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Căutați după nume, email, specialitate…"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterDoctorRole} onValueChange={setFilterDoctorRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Toate rolurile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate rolurile</SelectItem>
                  <SelectItem value="specialist_doctor">Medici specialiști</SelectItem>
                  <SelectItem value="lab_doctor">Medici laborator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctor grid */}
            {filteredDoctors.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Niciun medic găsit</EmptyTitle>
                  <EmptyDescription>
                    {doctorSearch || filterDoctorRole !== "all"
                      ? "Încercați să ștergeți filtrele."
                      : "Adăugați un medic pentru a începe."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => onNavigate("add-doctor")} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Adaugă medic
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDoctors.map((doctor) => {
                  const cfg = roleConfig[doctor.doctorRole];
                  return (
                    <div
                      key={doctor.id}
                      className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-11 h-11">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(doctor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{doctor.name}</p>
                            <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDoctor(doctor)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editează medic
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteDoctorConfirm(doctor)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Elimină medic
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{doctor.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{doctor.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{doctor.department}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono">{doctor.licenseNumber}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Add/Edit Patient Modal ──────────────────────────────────────────── */}
      <Dialog
        open={isPatientModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPatientModalOpen(false);
            patientForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPatient ? "Editează pacient" : "Adaugă pacient nou"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={patientForm.handleSubmit(onPatientSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="fullName">Nume complet *</Label>
                <Input id="fullName" placeholder="ex. Ion Popescu" {...patientForm.register("fullName")} />
                {patientForm.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{patientForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Data nașterii *</Label>
                <Input id="dateOfBirth" type="date" {...patientForm.register("dateOfBirth")} />
                {patientForm.formState.errors.dateOfBirth && (
                  <p className="text-xs text-destructive">{patientForm.formState.errors.dateOfBirth.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Sex *</Label>
                <Select value={patientForm.watch("sex")} onValueChange={(v) => patientForm.setValue("sex", v as Sex)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Masculin</SelectItem>
                    <SelectItem value="Female">Feminin</SelectItem>
                    <SelectItem value="Other">Alt sex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationalId">CNP *</Label>
                <Input id="nationalId" placeholder="ex. 1234567890123" {...patientForm.register("nationalId")} />
                {patientForm.formState.errors.nationalId && (
                  <p className="text-xs text-destructive">{patientForm.formState.errors.nationalId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon *</Label>
                <Input id="phone" type="tel" placeholder="+40 755 000 000" {...patientForm.register("phone")} />
                {patientForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{patientForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patEmail">Email *</Label>
                <Input id="patEmail" type="email" placeholder="pacient@email.com" {...patientForm.register("email")} />
                {patientForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{patientForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Grup sanguin *</Label>
                <Select
                  value={patientForm.watch("bloodType")}
                  onValueChange={(v) => patientForm.setValue("bloodType", v as BloodType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {bt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="allergies">Alergii</Label>
                <Textarea
                  id="allergies"
                  placeholder="Listați alergiile cunoscute sau 'Niciunul'"
                  rows={2}
                  {...patientForm.register("allergies")}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="currentMedications">Medicamente curente</Label>
                <Textarea
                  id="currentMedications"
                  placeholder="Listați medicamentele curente sau 'Niciunul'"
                  rows={2}
                  {...patientForm.register("currentMedications")}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPatientModalOpen(false);
                  patientForm.reset();
                }}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={patientForm.formState.isSubmitting}>
                {patientForm.formState.isSubmitting
                  ? "Se salvează..."
                  : editingPatient
                    ? "Salvează modificările"
                    : "Adaugă pacient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Confirm */}
      <Dialog open={!!deletePatientConfirm} onOpenChange={() => setDeletePatientConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Șterge pacient?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Aceasta va șterge definitiv <strong>{deletePatientConfirm?.fullName}</strong> și toate înregistrările sale.
            Această acțiune nu poate fi anulată.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeletePatientConfirm(null)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletePatientConfirm) {
                  deletePatient(deletePatientConfirm.id);
                  setDeletePatientConfirm(null);
                }
              }}
            >
              Șterge pacient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Doctor Modal ───────────────────────────────────────────── */}
      <Dialog
        open={isDoctorModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDoctorModalOpen(false);
            doctorForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Editează medic" : "Adaugă medic nou"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={doctorForm.handleSubmit(onDoctorSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tip medic *</Label>
              <Select
                value={doctorForm.watch("doctorRole")}
                onValueChange={(v) => doctorForm.setValue("doctorRole", v as DoctorRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specialist_doctor">
                    <span className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      Medic specialist
                    </span>
                  </SelectItem>
                  <SelectItem value="lab_doctor">
                    <span className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      Medic laborator
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleConfig[doctorForm.watch("doctorRole")]?.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="docName">Nume complet *</Label>
                <Input id="docName" placeholder="e.g. Dr. Jane Smith" {...doctorForm.register("name")} />
                {doctorForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docEmail">Adresă email *</Label>
                <Input id="docEmail" type="email" placeholder="doctor@hospital.com" {...doctorForm.register("email")} />
                {doctorForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docPhone">Număr de telefon *</Label>
                <Input id="docPhone" type="tel" placeholder="+1 (555) 000-0000" {...doctorForm.register("phone")} />
                {doctorForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docSpecialty">Specialitate *</Label>
                <Input
                  id="docSpecialty"
                  placeholder={
                    doctorForm.watch("doctorRole") === "lab_doctor" ? "ex. Patologie clinică" : "ex. Cardiologie"
                  }
                  {...doctorForm.register("specialty")}
                />
                {doctorForm.formState.errors.specialty && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.specialty.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docDept">Departament *</Label>
                <Input
                  id="docDept"
                  placeholder={
                    doctorForm.watch("doctorRole") === "lab_doctor" ? "ex. Laborator" : "ex. Medicină internă"
                  }
                  {...doctorForm.register("department")}
                />
                {doctorForm.formState.errors.department && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.department.message}</p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="docLicense">Număr de licență *</Label>
                <Input
                  id="docLicense"
                  placeholder={doctorForm.watch("doctorRole") === "lab_doctor" ? "ex. LAB-0042" : "ex. MD-4821"}
                  {...doctorForm.register("licenseNumber")}
                />
                {doctorForm.formState.errors.licenseNumber && (
                  <p className="text-xs text-destructive">{doctorForm.formState.errors.licenseNumber.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Notă:</strong> După adăugarea unui medic, datele de autentificare vor folosi emailul de mai sus
                cu parola de sistem <span className="font-mono font-bold">MedKit2025!</span>. Contactați IT pentru a
                seta o parolă personalizată.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsDoctorModalOpen(false);
                  doctorForm.reset();
                }}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={doctorForm.formState.isSubmitting}>
                {doctorForm.formState.isSubmitting
                  ? "Se salvează..."
                  : editingDoctor
                    ? "Salvează modificările"
                    : "Adaugă medic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Doctor Confirm */}
      <Dialog open={!!deleteDoctorConfirm} onOpenChange={() => setDeleteDoctorConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Elimină medic?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Aceasta va elimina <strong>{deleteDoctorConfirm?.name}</strong> din sistem. Nu va mai putea să se
            autentifice. Această acțiune nu poate fi anulată.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDoctorConfirm(null)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDoctorConfirm) {
                  deleteDoctor(deleteDoctorConfirm.id);
                  setDeleteDoctorConfirm(null);
                }
              }}
            >
              Elimină medic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
