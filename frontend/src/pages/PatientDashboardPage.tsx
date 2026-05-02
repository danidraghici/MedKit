import { useState, useEffect } from "react";
import {
  Calendar,
  FlaskConical,
  FileText,
  Bell,
  Plus,
  Clock,
  ChevronRight,
  Heart,
  Pill,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Activity,
  TrendingUp,
  ShieldCheck,
  X,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CreateAppointmentDialog from "@/components/CreateAppointmentDialog";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type {
  Appointment,
  AppointmentRequest,
  LabAIInsight,
  LabResult,
  MedicalRecord,
  UserNotification,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", { year: "numeric", month: "short", day: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function calcAge(dob: string) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function isScheduledAppointmentStatus(status: string) {
  return status === "Scheduled" || status === "Programat" || status === "Programată" || status === "Planificată";
}

const REMINDER_ICONS: Record<string, React.ReactNode> = {
  "follow-up-due": <Calendar className="w-4 h-4" />,
  "annual-checkup": <Activity className="w-4 h-4" />,
  "lab-result-ready": <FlaskConical className="w-4 h-4" />,
  "medication-refill": <Pill className="w-4 h-4" />,
  "specialist-referral": <ClipboardList className="w-4 h-4" />,
  appointment: <Calendar className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

type ReminderViewModel = {
  id: string;
  title: string;
  message: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  type: string;
  countdownLabel?: string;
};

const URGENCY_CONFIG = {
  Normal: {
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Normal",
  },
  Monitor: {
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Monitorizare",
  },
  "Consult Doctor": {
    color:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Consultă medicul",
  },
  Urgent: {
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Urgent",
  },
};

function translateAppointmentStatus(status: string): string {
  switch (status) {
    case "Approved":
      return "Aprobată";
    case "Completed":
      return "Finalizată";
    case "Pending":
      return "În așteptare";
    case "Scheduled":
      return "Planificată";
    case "Rejected":
      return "Respinsă";
    case "Cancelled":
      return "Anulată";
    default:
      return status;
  }
}

function translateAppointmentType(type: string): string {
  switch (type) {
    case "Consult":
      return "Consultație";
    case "Control":
      return "Control";
    case "Analize laborator - prelevare":
      return "Analize laborator - prelevare";
    case "Urgență":
      return "Urgență";
    case "Telemedicină":
      return "Telemedicină";
    case "Procedură":
      return "Procedură";
    case "Control Anual":
      return "Control anual";
    default:
      return type;
  }
}

interface PatientDashboardPageProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function PatientDashboardPage({ activeTab: activeTabProp, onTabChange }: PatientDashboardPageProps) {
  const user = useAppStore((s) => s.user);
  const patients = useAppStore((s) => s.patients);
  const fetchPatients = useAppStore((s) => s.fetchPatients);
  const getLabAIInsight = useAppStore((s) => s.getLabAIInsight);
  const generateLabAIInsight = useAppStore((s) => s.generateLabAIInsight);
  const notifications = useAppStore((s) => s.notifications);
  const fetchNotifications = useAppStore((s) => s.fetchNotifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<MedicalRecord[]>([]);
  const [patientLabResults, setPatientLabResults] = useState<LabResult[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientRequests, setPatientRequests] = useState<AppointmentRequest[]>([]);

  const patient = patients.find((p) => p.id === user?.patientId) ?? patients[0];
  const patientId = patient?.id ?? "";
  const matchesCurrentPatient = (value: string) => !patientId || value.toLowerCase() === patientId.toLowerCase();

  const myRecords = patientMedicalRecords
    .filter((r) => matchesCurrentPatient(r.patientId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myLabs = patientLabResults
    .filter((r) => matchesCurrentPatient(r.patientId))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const myAppointments = patientAppointments.filter((a) => matchesCurrentPatient(a.patientId));
  const myRequests = patientRequests
    .filter((r) => matchesCurrentPatient(r.patientId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const upcomingItems = [
    ...myAppointments.filter((a) => isScheduledAppointmentStatus(a.status) && getDaysUntil(a.date) >= 0),
    ...myRequests.filter((r) => r.status !== "Rejected" && getDaysUntil(r.requestedDate) >= 0),
  ];
  const reminders = notifications
    .filter((notification) => !notification.isRead)
    .map((notification) => mapNotificationToReminder(notification, patientAppointments));

  const [internalTab, setInternalTab] = useState(activeTabProp ?? "overview");
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = (tab: string) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Keep internal tab in sync when sidebar nav changes activeTabProp
  useEffect(() => {
    if (activeTabProp) setInternalTab(activeTabProp);
  }, [activeTabProp]);

  useEffect(() => {
    if (user?.role === "patient") void fetchPatients();
  }, [user?.role, fetchPatients]);

  useEffect(() => {
    if (user?.role === "patient") void fetchNotifications();
  }, [user?.role, fetchNotifications]);

  useEffect(() => {
    if (user?.role !== "patient") return;

    let cancelled = false;

    void Promise.allSettled([
      api.get<MedicalRecord[]>("/api/dashboard/patient/medical-records"),
      api.get<LabResult[]>("/api/dashboard/patient/lab-results"),
      api.get<Appointment[]>("/api/dashboard/patient/appointments"),
      api.get<AppointmentRequest[]>("/api/appointment-requests/my"),
    ]).then(([recordsResult, labsResult, appointmentsResult, requestsResult]) => {
      if (cancelled) return;

      if (recordsResult.status === "fulfilled") setPatientMedicalRecords(recordsResult.value);
      if (labsResult.status === "fulfilled") setPatientLabResults(labsResult.value);
      if (appointmentsResult.status === "fulfilled") setPatientAppointments(appointmentsResult.value);
      if (requestsResult.status === "fulfilled") setPatientRequests(requestsResult.value);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (departments.length === 0) void fetchDepartments();
    if (doctors.length === 0) void fetchDoctors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [insightModalInsight, setInsightModalInsight] = useState<LabAIInsight | null>(null);
  const [apptSuccess, setApptSuccess] = useState(false);

  const handleOpenInsight = (labResultId: string) => {
    let insight = getLabAIInsight(labResultId);
    if (!insight) insight = generateLabAIInsight(labResultId, patientId);
    setInsightModalInsight(insight);
  };

  const handleAppointmentCreated = async () => {
    try {
      const [appointments, requests] = await Promise.all([
        api.get<Appointment[]>("/api/dashboard/patient/appointments"),
        api.get<AppointmentRequest[]>("/api/appointment-requests/my"),
      ]);

      setPatientAppointments(appointments);
      setPatientRequests(requests);
      setApptSuccess(true);
      setTimeout(() => setApptSuccess(false), 5000);
    } catch {
      // Keep optimistic UX even if refresh fails; next page load will sync data.
      setApptSuccess(true);
      setTimeout(() => setApptSuccess(false), 5000);
    }
  };

  const statusBadge = (status: string) => {
    const label = translateAppointmentStatus(status);
    if (status === "Approved" || status === "Completed" || status === "Aprobată" || status === "Finalizată") {
      return <Badge variant="success">{label}</Badge>;
    }
    if (status === "Pending" || status === "Scheduled" || status === "În așteptare" || status === "Planificată") {
      return <Badge variant="warning">{label}</Badge>;
    }
    if (status === "Rejected" || status === "Cancelled" || status === "Respinsă" || status === "Anulată") {
      return <Badge variant="destructive">{label}</Badge>;
    }
    return <Badge>{label}</Badge>;
  };

  const priorityColor = {
    high: "border-l-red-500",
    medium: "border-l-amber-400",
    low: "border-l-blue-400",
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nu a fost găsit un profil de pacient pentru contul tău.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bine ai revenit, {patient.fullName.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("ro-RO", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button
          onClick={() => setApptModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Programare nouă
        </Button>
      </div>

      {/* Success alert */}
      {apptSuccess && (
        <Alert variant="success" className="border-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription>Programarea a fost creată cu succes.</AlertDescription>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Dosare medicale",
            value: myRecords.length,
            icon: FileText,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Rezultate de laborator",
            value: myLabs.length,
            icon: FlaskConical,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
          {
            label: "Programări",
            value: myAppointments.length + myRequests.length,
            icon: Calendar,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Mementouri",
            value: reminders.length,
            icon: Bell,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="cursor-default">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Patient info strip */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {[
              { label: "Vârstă", value: `${calcAge(patient.dateOfBirth)} ani` },
              { label: "Grupa sanguină", value: patient.bloodType },
              { label: "Sex", value: patient.sex },
              { label: "Alergii", value: patient.allergies || "Fără alergii cunoscute" },
              { label: "Medicație curentă", value: patient.currentMedications || "Niciuna" },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-muted-foreground">{item.label}: </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" /> Mementouri și alerte
          </h2>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`flex items-start gap-3 p-3 rounded-xl border border-l-4 bg-card ${priorityColor[r.priority]}`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${r.priority === "high" ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : r.priority === "medium" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"}`}
                >
                  {REMINDER_ICONS[r.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <button
                      onClick={() => void markNotificationRead(r.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.countdownLabel ?? formatDate(r.dueDate)}
                    </span>
                    {r.type === "appointment" ? (
                      <button
                        onClick={() => setActiveTab("appointments")}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        Vezi programările <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Prezentare generală</TabsTrigger>
          <TabsTrigger value="history">Istoric medical</TabsTrigger>
          <TabsTrigger value="labs">Rezultate laborator</TabsTrigger>
          <TabsTrigger value="appointments">Programări</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent records */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Dosare medicale recente</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("history")}>
                    Vezi toate <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {myRecords.slice(0, 3).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 mt-0.5 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rec.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rec.date)} · {rec.doctor}
                      </p>
                    </div>
                  </div>
                ))}
                {myRecords.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nu au fost găsite dosare</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming appointments */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Programări viitoare</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setActiveTab("appointments")}
                  >
                    Vezi toate <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {upcomingItems.slice(0, 3).map((apt) => {
                  const isRequest = "requestedDate" in apt;
                  return (
                    <div
                      key={apt.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 mt-0.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {isRequest
                              ? translateAppointmentType((apt as (typeof myRequests)[0]).type)
                              : translateAppointmentType((apt as (typeof myAppointments)[0]).type)}
                          </p>
                          {statusBadge(apt.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isRequest
                            ? `${formatDate((apt as (typeof myRequests)[0]).requestedDate)} · ${(apt as (typeof myRequests)[0]).requestedTime}`
                            : `${formatDate((apt as (typeof myAppointments)[0]).date)} · ${(apt as (typeof myAppointments)[0]).time}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {upcomingItems.length === 0 && (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Nu există programări viitoare</p>
                    <Button size="sm" variant="outline" onClick={() => setApptModalOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Programează una
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lab files quick summary */}
          {myLabs.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Cel mai recent buletin de analize disponibil
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{myLabs[0].originalFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(myLabs[0].uploadedAt)} · {myLabs[0].uploaderName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 shrink-0"
                    onClick={() => handleOpenInsight(myLabs[0].id)}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Analiză AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── MEDICAL HISTORY ── */}
        <TabsContent value="history" className="mt-0">
          <div className="space-y-4">
            {myRecords.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nu au fost găsite dosare medicale.
                </CardContent>
              </Card>
            ) : (
              myRecords.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-base">{rec.diagnosis}</h3>
                        {rec.icdCode && <span className="text-xs text-muted-foreground font-mono">{rec.icdCode}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{rec.visitType}</Badge>
                        <Badge
                          variant={
                            rec.urgency === "Urgență"
                              ? "destructive"
                              : rec.urgency === "Urgent"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {rec.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(rec.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {rec.doctor}
                      </span>
                    </div>
                    {rec.chiefComplaint && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium text-foreground">Motiv principal: </span>
                        {rec.chiefComplaint}
                      </p>
                    )}
                    {rec.symptoms && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium text-foreground">Simptome: </span>
                        {rec.symptoms}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">Tratament: </span>
                      {rec.treatment}
                    </p>
                    {(rec.prescribedDrugs?.length ?? 0) > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Pill className="w-3 h-3" /> Medicație prescrisă
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(rec.prescribedDrugs ?? []).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs"
                            >
                              <span className="font-medium text-blue-700 dark:text-blue-300">{d.name}</span>
                              <span className="text-blue-500">
                                {d.dose} · {d.frequency}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(rec.followUpIn || rec.followUpType) && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Control: {rec.followUpIn} — {rec.followUpType}
                        </span>
                      </div>
                    )}
                    {rec.patientEducation && (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                        <span className="font-semibold block mb-0.5">Instrucțiuni de la medicul tău:</span>
                        {rec.patientEducation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── LAB RESULTS ── */}
        <TabsContent value="labs" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Apasă pe <strong>Analiză AI</strong> la orice rezultat pentru o explicație pe înțelesul tău și
                recomandări personalizate generate de AI.
              </span>
            </div>
            {myLabs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nu au fost găsite rezultate de laborator.
                </CardContent>
              </Card>
            ) : (
              myLabs.map((lab) => {
                const insight = getLabAIInsight(lab.id);
                return (
                  <Card key={lab.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{lab.originalFileName}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                            <span>
                              <span className="font-medium text-foreground">Data:</span> {formatDate(lab.uploadedAt)}
                            </span>
                            <span>
                              <span className="font-medium text-foreground">Încărcat de:</span> {lab.uploaderName}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950/30"
                          onClick={() => handleOpenInsight(lab.id)}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {insight ? "Vezi analiza AI" : "Generează analiză AI"}
                        </Button>
                      </div>
                      {/* Preview insight if available */}
                      {insight && (
                        <div className={`mt-3 p-3 rounded-xl border text-sm ${URGENCY_CONFIG[insight.urgency].color}`}>
                          <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wide mb-1">
                            {URGENCY_CONFIG[insight.urgency].icon}
                            {URGENCY_CONFIG[insight.urgency].label}
                          </div>
                          <p className="line-clamp-2">{insight.summary}</p>
                          <button
                            className="text-xs font-medium mt-1 underline underline-offset-2 opacity-75 hover:opacity-100"
                            onClick={() => setInsightModalInsight(insight)}
                          >
                            Citește analiza completă →
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── APPOINTMENTS ── */}
        <TabsContent value="appointments" className="mt-0">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Programările tale</h3>
              <Button
                onClick={() => setApptModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Programare nouă
              </Button>
            </div>

            {/* Existing appointments */}
            {myAppointments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Programate de echipa ta medicală</p>
                <div className="space-y-2">
                  {myAppointments.map((apt) => (
                    <Card key={apt.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{translateAppointmentType(apt.type)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(apt.date)} la {apt.time} · {apt.doctor}
                              </p>
                            </div>
                          </div>
                          {statusBadge(apt.status)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Patient requests */}
            {myRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Cererile tale de programare</p>
                <div className="space-y-2">
                  {myRequests.map((req) => (
                    <Card
                      key={req.id}
                      className={
                        req.status === "Approved"
                          ? "border-emerald-200 dark:border-emerald-800"
                          : req.status === "Rejected"
                            ? "border-destructive/30"
                            : ""
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${req.status === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : req.status === "Rejected" ? "bg-red-50 dark:bg-red-950/30 text-red-600" : "bg-muted text-muted-foreground"}`}
                            >
                              {req.status === "Approved" ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : req.status === "Rejected" ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold text-sm">{translateAppointmentType(req.type)}</p>
                                {statusBadge(req.status)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(req.requestedDate)} la {req.requestedTime}
                              </p>
                              {req.preferredDoctor && (
                                <p className="text-xs text-muted-foreground">Preferat: {req.preferredDoctor}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 italic">{req.reason}</p>
                              {req.responseNote && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                                  ✓ {req.responseNote}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDateTime(req.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {myAppointments.length === 0 && myRequests.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Nu ai încă programări.</p>
                  <Button
                    onClick={() => setApptModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Programează prima consultație
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── AI Insight Modal ── */}
      <Dialog
        open={!!insightModalInsight}
        onOpenChange={(o) => {
          if (!o) setInsightModalInsight(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Interpretare AI rezultate laborator
            </DialogTitle>
          </DialogHeader>
          {insightModalInsight && (
            <div className="space-y-4">
              {/* Urgency banner */}
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm ${URGENCY_CONFIG[insightModalInsight.urgency].color}`}
              >
                {URGENCY_CONFIG[insightModalInsight.urgency].icon}
                {URGENCY_CONFIG[insightModalInsight.urgency].label}
              </div>

              {/* Summary */}
              <p className="text-sm leading-relaxed">{insightModalInsight.summary}</p>

              {/* Findings */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Constatări</p>
                <ul className="space-y-1">
                  {insightModalInsight.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recomandări</p>
                <ul className="space-y-1">
                  {insightModalInsight.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                {insightModalInsight.disclaimer}
              </div>
              <p className="text-xs text-muted-foreground text-right">
                Generat la {formatDateTime(insightModalInsight.generatedAt)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateAppointmentDialog
        open={apptModalOpen}
        onOpenChange={setApptModalOpen}
        preselectedPatientId={patientId}
        onSuccess={() => {
          void handleAppointmentCreated();
        }}
      />
    </div>
  );
}

function mapNotificationToReminder(notification: UserNotification, appointments: Appointment[]): ReminderViewModel {
  let type = "general";
  if (notification.relatedEntityType === "lab_request") type = "lab-result-ready";
  else if (notification.relatedEntityType === "appointment") type = "appointment";

  let priority: ReminderViewModel["priority"] = "low";
  if (type === "lab-result-ready") priority = "high";
  else if (type === "appointment") priority = "medium";

  let dueDate = notification.createdAt;
  let title = notification.title;
  let countdownLabel: string | undefined;

  if (type === "appointment") {
    const appointment = resolveAppointmentForReminder(notification, appointments);
    if (appointment?.date) {
      dueDate = appointment.date;
      const daysUntil = getDaysUntil(appointment.date);
      if (daysUntil > 1) {
        title = `Programare nouă în ${daysUntil} zile`;
        countdownLabel = `În ${daysUntil} zile`;
      } else if (daysUntil === 1) {
        title = "Programare nouă în 1 zi";
        countdownLabel = "Mâine";
      } else if (daysUntil === 0) {
        title = "Programare nouă astăzi";
        countdownLabel = "Astăzi";
      } else {
        title = "Programare nouă";
        countdownLabel = `${Math.abs(daysUntil)} zi${Math.abs(daysUntil) === 1 ? "" : "le"} în urmă`;
      }
    }
  }

  return {
    id: notification.id,
    title,
    message: notification.body ?? "",
    dueDate,
    priority,
    type,
    countdownLabel,
  };
}

function resolveAppointmentForReminder(
  notification: UserNotification,
  appointments: Appointment[],
): Appointment | undefined {
  if (appointments.length === 0) return undefined;

  const relatedId = normalizeId(notification.relatedEntityId);
  if (relatedId) {
    const exactMatch = appointments.find((item) => normalizeId(item.id) === relatedId);
    if (exactMatch) return exactMatch;
  }

  const upcoming = appointments
    .filter((item) => isScheduledAppointmentStatus(item.status) && getDaysUntil(item.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  return upcoming[0] ?? appointments[0];
}

function normalizeId(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function getDaysUntil(dateIso: string): number {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(dateIso);
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
