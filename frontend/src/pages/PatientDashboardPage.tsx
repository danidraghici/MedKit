import { useState, useEffect } from "react";
import {
  Calendar, FlaskConical, FileText, Bell, Plus, Clock, ChevronRight,
  Heart, Pill, AlertTriangle, CheckCircle2, XCircle, Sparkles,
  Activity, TrendingUp, ShieldCheck, X, ClipboardList, Phone, Building2, Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import type { AppointmentType, LabAIInsight } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function calcAge(dob: string) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const REMINDER_ICONS: Record<string, React.ReactNode> = {
  "follow-up-due": <Calendar className="w-4 h-4" />,
  "annual-checkup": <Activity className="w-4 h-4" />,
  "lab-result-ready": <FlaskConical className="w-4 h-4" />,
  "medication-refill": <Pill className="w-4 h-4" />,
  "specialist-referral": <ClipboardList className="w-4 h-4" />,
};

const URGENCY_CONFIG = {
  Normal: { color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 className="w-4 h-4" />, label: "Normal" },
  Monitor: { color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800", icon: <TrendingUp className="w-4 h-4" />, label: "Monitor" },
  "Consult Doctor": { color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: <AlertTriangle className="w-4 h-4" />, label: "Consult Doctor" },
  Urgent: { color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: <AlertTriangle className="w-4 h-4" />, label: "Urgent" },
};

const APPOINTMENT_TYPES: AppointmentType[] = [
  "General Consultation", "Follow-up", "Lab Review", "Emergency",
  "Telemedicine", "Specialist Referral", "Annual Check-up",
];

const TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "02:00 PM", "02:30 PM", "03:00 PM",
  "03:30 PM", "04:00 PM", "04:30 PM",
];

interface PatientDashboardPageProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function PatientDashboardPage({ activeTab: activeTabProp, onTabChange }: PatientDashboardPageProps) {
  const user = useAppStore((s) => s.user);
  const patients = useAppStore((s) => s.patients);
  const medicalRecords = useAppStore((s) => s.medicalRecords);
  const labResults = useAppStore((s) => s.labResults);
  const appointments = useAppStore((s) => s.appointments);
  const getPatientAppointmentRequests = useAppStore((s) => s.getPatientAppointmentRequests);
  const getLabAIInsight = useAppStore((s) => s.getLabAIInsight);
  const generateLabAIInsight = useAppStore((s) => s.generateLabAIInsight);
  const getPatientReminders = useAppStore((s) => s.getPatientReminders);
  const dismissReminder = useAppStore((s) => s.dismissReminder);
  const addAppointmentRequest = useAppStore((s) => s.addAppointmentRequest);
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);

  const patient = patients.find((p) => p.id === user?.patientId);
  const patientId = patient?.id ?? "";

  const myRecords = medicalRecords.filter((r) => r.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myLabs = labResults.filter((r) => r.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myAppointments = appointments.filter((a) => a.patientId === patientId);
  const myRequests = getPatientAppointmentRequests(patientId);
  const reminders = getPatientReminders(patientId);

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
    if (departments.length === 0) void fetchDepartments();
    if (doctors.length === 0) void fetchDoctors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [insightModalInsight, setInsightModalInsight] = useState<LabAIInsight | null>(null);
  const [apptSuccess, setApptSuccess] = useState(false);

  // Appointment request form state
  const [apptForm, setApptForm] = useState({
    type: "" as AppointmentType | "",
    date: "",
    time: "",
    reason: "",
    preferredDepartment: "",
    preferredDoctor: "",
  });
  const [apptFormError, setApptFormError] = useState("");

  const handleOpenInsight = (labResultId: string) => {
    let insight = getLabAIInsight(labResultId);
    if (!insight) insight = generateLabAIInsight(labResultId, patientId);
    setInsightModalInsight(insight);
  };

  const handleApptSubmit = () => {
    if (!apptForm.type || !apptForm.date || !apptForm.time || !apptForm.reason.trim()) {
      setApptFormError("Please fill in all required fields.");
      return;
    }
    setApptFormError("");
    addAppointmentRequest({
      patientId,
      patientName: patient?.fullName ?? "",
      requestedDate: apptForm.date,
      requestedTime: apptForm.time,
      type: apptForm.type as AppointmentType,
      reason: apptForm.reason,
      preferredDoctor: apptForm.preferredDoctor || undefined,
    });
    setApptForm({ type: "", date: "", time: "", reason: "", preferredDepartment: "", preferredDoctor: "" });
    setApptModalOpen(false);
    setApptSuccess(true);
    setTimeout(() => setApptSuccess(false), 5000);
  };

  const statusBadge = (status: string) => {
    if (status === "Approved" || status === "Completed") return <Badge variant="success">{status}</Badge>;
    if (status === "Pending" || status === "Scheduled") return <Badge variant="warning">{status}</Badge>;
    if (status === "Rejected" || status === "Cancelled") return <Badge variant="destructive">{status}</Badge>;
    return <Badge>{status}</Badge>;
  };

  const labStatusBadge = (status: string) => {
    if (status === "Normal") return <Badge variant="success">Normal</Badge>;
    if (status === "Abnormal") return <Badge variant="warning">Abnormal</Badge>;
    if (status === "Critical") return <Badge variant="destructive">Critical</Badge>;
    return <Badge>{status}</Badge>;
  };

  const priorityColor = {
    high: "border-l-red-500",
    medium: "border-l-amber-400",
    low: "border-l-blue-400",
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No patient record found for your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {patient.fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setApptModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Request appointment
        </Button>
      </div>

      {/* Success alert */}
      {apptSuccess && (
        <Alert variant="success" className="border-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription>Appointment request submitted successfully! Your care team will confirm it shortly.</AlertDescription>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Medical records", value: myRecords.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Lab results", value: myLabs.length, icon: FlaskConical, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Appointments", value: myAppointments.filter((a) => a.status === "Scheduled").length, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Reminders", value: reminders.length, icon: Bell, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
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
              { label: "Age", value: `${calcAge(patient.dateOfBirth)} years` },
              { label: "Blood type", value: patient.bloodType },
              { label: "Sex", value: patient.sex },
              { label: "Allergies", value: patient.allergies || "None known" },
              { label: "Current medications", value: patient.currentMedications || "None" },
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
            <Bell className="w-3.5 h-3.5" /> Reminders & alerts
          </h2>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border border-l-4 bg-card ${priorityColor[r.priority]}`}>
                <div className={`p-1.5 rounded-lg mt-0.5 ${r.priority === "high" ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : r.priority === "medium" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"}`}>
                  {REMINDER_ICONS[r.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <button onClick={() => dismissReminder(r.id)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {formatDate(r.dueDate)}
                    </span>
                    {r.type === "follow-up-due" || r.type === "specialist-referral" ? (
                      <button onClick={() => setApptModalOpen(true)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                        Book now <ChevronRight className="w-3 h-3" />
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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Medical history</TabsTrigger>
          <TabsTrigger value="labs">Lab results</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent records */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Recent medical records</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("history")}>
                    View all <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {myRecords.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 mt-0.5 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rec.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(rec.date)} · {rec.doctor}</p>
                    </div>
                  </div>
                ))}
                {myRecords.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No records found</p>}
              </CardContent>
            </Card>

            {/* Upcoming appointments */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Upcoming appointments</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("appointments")}>
                    View all <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {[...myAppointments.filter((a) => a.status === "Scheduled"), ...myRequests.filter((r) => r.status !== "Rejected")].slice(0, 3).map((apt) => {
                  const isRequest = "requestedDate" in apt;
                  return (
                    <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 mt-0.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{isRequest ? (apt as typeof myRequests[0]).type : (apt as typeof myAppointments[0]).type}</p>
                          {statusBadge(apt.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isRequest
                            ? `${formatDate((apt as typeof myRequests[0]).requestedDate)} · ${(apt as typeof myRequests[0]).requestedTime}`
                            : `${formatDate((apt as typeof myAppointments[0]).date)} · ${(apt as typeof myAppointments[0]).time}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {myAppointments.length === 0 && myRequests.length === 0 && (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                    <Button size="sm" variant="outline" onClick={() => setApptModalOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Request one
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lab AI highlight */}
          {myLabs.some((l) => l.status !== "Normal") && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Lab results needing attention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {myLabs.filter((l) => l.status !== "Normal").map((lab) => (
                  <div key={lab.id} className="flex items-center justify-between p-3 rounded-lg bg-card border gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lab.testName}</p>
                      <p className="text-xs text-muted-foreground">{lab.result} {lab.unit} · {formatDate(lab.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {labStatusBadge(lab.status)}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleOpenInsight(lab.id)}>
                        <Sparkles className="w-3 h-3 text-amber-500" /> AI insight
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── MEDICAL HISTORY ── */}
        <TabsContent value="history" className="mt-0">
          <div className="space-y-4">
            {myRecords.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No medical records found.</CardContent></Card>
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
                        <Badge variant={rec.urgency === "Emergency" ? "destructive" : rec.urgency === "Urgent" ? "warning" : "secondary"}>
                          {rec.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(rec.date)}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{rec.doctor}</span>
                    </div>
                    {rec.chiefComplaint && (
                      <p className="text-sm text-muted-foreground mb-2"><span className="font-medium text-foreground">Chief complaint: </span>{rec.chiefComplaint}</p>
                    )}
                    {rec.symptoms && (
                      <p className="text-sm text-muted-foreground mb-2"><span className="font-medium text-foreground">Symptoms: </span>{rec.symptoms}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-2"><span className="font-medium text-foreground">Treatment: </span>{rec.treatment}</p>
                    {(rec.prescribedDrugs?.length ?? 0) > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Pill className="w-3 h-3" /> Prescribed medications
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(rec.prescribedDrugs ?? []).map((d) => (
                            <div key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
                              <span className="font-medium text-blue-700 dark:text-blue-300">{d.name}</span>
                              <span className="text-blue-500">{d.dose} · {d.frequency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(rec.followUpIn || rec.followUpType) && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Follow-up: {rec.followUpIn} — {rec.followUpType}</span>
                      </div>
                    )}
                    {rec.patientEducation && (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                        <span className="font-semibold block mb-0.5">Instructions from your doctor:</span>
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
              <span>Click <strong>AI insight</strong> on any result to get a plain-language explanation and personalised recommendations powered by AI.</span>
            </div>
            {myLabs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No lab results found.</CardContent></Card>
            ) : (
              myLabs.map((lab) => {
                const insight = getLabAIInsight(lab.id);
                return (
                  <Card key={lab.id} className={lab.status === "Critical" ? "border-red-300 dark:border-red-800" : lab.status === "Abnormal" ? "border-amber-300 dark:border-amber-800" : ""}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{lab.testName}</h3>
                            {labStatusBadge(lab.status)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span><span className="font-medium text-foreground">Result:</span> {lab.result} {lab.unit}</span>
                            <span><span className="font-medium text-foreground">Reference:</span> {lab.referenceRange}</span>
                            <span><span className="font-medium text-foreground">Date:</span> {formatDate(lab.date)}</span>
                          </div>
                          {lab.notes && <p className="text-sm text-muted-foreground mt-1.5 italic">{lab.notes}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950/30"
                          onClick={() => handleOpenInsight(lab.id)}>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          {insight ? "View AI insight" : "Get AI insight"}
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
                          <button className="text-xs font-medium mt-1 underline underline-offset-2 opacity-75 hover:opacity-100"
                            onClick={() => setInsightModalInsight(insight)}>Read full insight →</button>
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
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your appointments</h3>
              <Button onClick={() => setApptModalOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Request appointment
              </Button>
            </div>

            {/* Existing appointments */}
            {myAppointments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Scheduled by your care team</p>
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
                              <p className="font-semibold text-sm">{apt.type}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(apt.date)} at {apt.time} · {apt.doctor}</p>
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
                <p className="text-xs font-semibold text-muted-foreground mb-2">Your appointment requests</p>
                <div className="space-y-2">
                  {myRequests.map((req) => (
                    <Card key={req.id} className={req.status === "Approved" ? "border-emerald-200 dark:border-emerald-800" : req.status === "Rejected" ? "border-destructive/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${req.status === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : req.status === "Rejected" ? "bg-red-50 dark:bg-red-950/30 text-red-600" : "bg-muted text-muted-foreground"}`}>
                              {req.status === "Approved" ? <CheckCircle2 className="w-4 h-4" /> : req.status === "Rejected" ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold text-sm">{req.type}</p>
                                {statusBadge(req.status)}
                              </div>
                              <p className="text-xs text-muted-foreground">{formatDate(req.requestedDate)} at {req.requestedTime}</p>
                              {req.preferredDoctor && <p className="text-xs text-muted-foreground">Preferred: {req.preferredDoctor}</p>}
                              <p className="text-xs text-muted-foreground mt-1 italic">{req.reason}</p>
                              {req.responseNote && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">✓ {req.responseNote}</p>
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
                  <p className="text-muted-foreground">No appointments yet.</p>
                  <Button onClick={() => setApptModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Request your first appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── AI Insight Modal ── */}
      <Dialog open={!!insightModalInsight} onOpenChange={(o) => { if (!o) setInsightModalInsight(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> AI Lab Insight
            </DialogTitle>
          </DialogHeader>
          {insightModalInsight && (
            <div className="space-y-4">
              {/* Urgency banner */}
              <div className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm ${URGENCY_CONFIG[insightModalInsight.urgency].color}`}>
                {URGENCY_CONFIG[insightModalInsight.urgency].icon}
                {URGENCY_CONFIG[insightModalInsight.urgency].label}
              </div>

              {/* Summary */}
              <p className="text-sm leading-relaxed">{insightModalInsight.summary}</p>

              {/* Findings */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Findings</p>
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommendations</p>
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
                Generated {formatDateTime(insightModalInsight.generatedAt)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Book Appointment Modal ── */}
      <Dialog open={apptModalOpen} onOpenChange={setApptModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Request an appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {apptFormError && (
              <Alert variant="destructive" size="compact">
                <AlertDescription>{apptFormError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Appointment type <span className="text-destructive">*</span></Label>
                <Select value={apptForm.type} onValueChange={(v) => setApptForm((f) => ({ ...f, type: v as AppointmentType }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preferred date <span className="text-destructive">*</span></Label>
                <Input type="date" value={apptForm.date} min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setApptForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preferred time <span className="text-destructive">*</span></Label>
                <Select value={apptForm.time} onValueChange={(v) => setApptForm((f) => ({ ...f, time: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  <Building2 className="w-3 h-3 inline mr-1 opacity-60" />
                  Department
                </Label>
                <Select
                  value={apptForm.preferredDepartment}
                  onValueChange={(v) => setApptForm((f) => ({ ...f, preferredDepartment: v, preferredDoctor: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                <Stethoscope className="w-3 h-3 inline mr-1 opacity-60" />
                Preferred doctor
              </Label>
              <Select
                value={apptForm.preferredDoctor}
                onValueChange={(v) => setApptForm((f) => ({ ...f, preferredDoctor: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Any available" /></SelectTrigger>
                <SelectContent>
                  {(apptForm.preferredDepartment
                    ? doctors.filter((d) => d.departmentId === apptForm.preferredDepartment)
                    : doctors
                  ).map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name} — {d.specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason for visit <span className="text-destructive">*</span></Label>
              <Textarea placeholder="Please describe the reason for your appointment in a few sentences..."
                rows={3} value={apptForm.reason}
                onChange={(e) => setApptForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
              <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Your care team will review your request and confirm the appointment date and time. You will be notified once it is confirmed.</span>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setApptModalOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApptSubmit}>
                <Calendar className="w-4 h-4 mr-2" /> Submit request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
