import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  UserPlus,
  Search,
  Check,
  ChevronDown,
  User,
  Phone,
  Mail,
  Clock,
  Stethoscope,
  FileText,
  Loader2,
  Droplets,
  Pill,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CNPInput } from "@/components/ui/cnp-input";
import { isValidCNP } from "@/lib/cnp";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { getInitials, calculateAge } from "@/lib/utils";
import type { BloodType, Sex, Patient, Appointment, Department } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  "General Consultation",
  "Follow-up",
  "Lab Review",
  "Annual Check-up",
  "Telemedicine",
  "Emergency",
  "Specialist Referral",
  "Procedure",
  "Vaccination",
  "Prescription Renewal",
] as const;

const APPOINTMENT_TIMES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00",
];

// ── Schemas ──────────────────────────────────────────────────────────────────

const existingPatientSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
});

type ExistingPatientForm = z.infer<typeof existingPatientSchema>;

const newPatientSchema = z.object({
  // Patient
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().refine(isValidCNP, "Enter a valid 13-digit CNP."),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]),
  allergies: z.string(),
  currentMedications: z.string(),
  // Appointment
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
});

type NewPatientForm = z.infer<typeof newPatientSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface CreateAppointmentPageProps {
  onNavigate: (page: string) => void;
  preselectedPatientId?: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CreateAppointmentPage({
  onNavigate,
  preselectedPatientId,
}: CreateAppointmentPageProps) {
  const addPatient = useAppStore((s) => s.addPatient);
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const forceExisting = !!preselectedPatientId;
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    preselectedPatientId ?? null
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load patients from API and ensure doctors are present
  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      try {
        const [fetchedPatients] = await Promise.all([
          api.get<Patient[]>("/api/patients"),
          doctors.length === 0 ? fetchDoctors() : Promise.resolve(),
          departments.length === 0 ? fetchDepartments() : Promise.resolve(),
        ]);
        setPatients(fetchedPatients);
      } catch {
        // silently fall back — dropdowns may be empty
      } finally {
        setIsLoadingData(false);
      }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const filteredPatients = useMemo(() => {
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.nationalId.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const today = new Date().toISOString().split("T")[0];

  const existingForm = useForm<ExistingPatientForm>({
    resolver: zodResolver(existingPatientSchema),
    defaultValues: {
      doctorId: doctors[0]?.id ?? "",
      date: today,
      time: "09:00",
      type: "General Consultation",
      notes: "",
    },
  });

  const newPatientForm = useForm<NewPatientForm>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      sex: "Male",
      bloodType: "Unknown",
      nationalId: "",
      allergies: "",
      currentMedications: "",
      doctorId: doctors[0]?.id ?? "",
      date: today,
      time: "09:00",
      type: "General Consultation",
      notes: "",
    },
  });

  const handleBack = useCallback(() => {
    if (preselectedPatientId) {
      onNavigate(`patient-${preselectedPatientId}`);
    } else {
      onNavigate("appointments");
    }
  }, [preselectedPatientId, onNavigate]);

  const onSubmitExisting = async (data: ExistingPatientForm) => {
    if (!selectedPatient) return;
    setSubmitError(null);
    try {
      await api.post<Appointment>("/api/appointments", {
        patientId: selectedPatient.id,
        doctorId: data.doctorId,
        date: data.date,
        time: data.time,
        type: data.type,
        notes: data.notes ?? "",
      });
      setSubmitted(true);
      setTimeout(() => onNavigate("appointments"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to schedule appointment.";
      setSubmitError(message);
    }
  };

  const onSubmitNewPatient = async (data: NewPatientForm) => {
    setSubmitError(null);
    try {
      const newPatient = await addPatient({
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex as Sex,
        nationalId: data.nationalId,
        phone: data.phone,
        email: data.email,
        bloodType: data.bloodType as BloodType,
        allergies: data.allergies,
        currentMedications: data.currentMedications,
      });
      await api.post<Appointment>("/api/appointments", {
        patientId: newPatient.id,
        doctorId: data.doctorId,
        date: data.date,
        time: data.time,
        type: data.type,
        notes: data.notes ?? "",
      });
      setSubmitted(true);
      setTimeout(() => onNavigate("appointments"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register patient or schedule appointment.";
      setSubmitError(message);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Appointment Scheduled!</h2>
        <p className="text-muted-foreground text-sm">Redirecting to appointments…</p>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Appointment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {forceExisting && selectedPatient
              ? `Booking for ${selectedPatient.fullName}`
              : "Book a new appointment for an existing or new patient"}
          </p>
        </div>
      </div>

      {/* ── Pre-selected patient flow ──────────────────────────────────────── */}
      {forceExisting && selectedPatient ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 shrink-0">
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {getInitials(selectedPatient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base">{selectedPatient.fullName}</p>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">Patient</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span>{calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex} · {selectedPatient.bloodType}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedPatient.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedPatient.email}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={existingForm.handleSubmit(onSubmitExisting)} className="space-y-5">
                <AppointmentFields
                  form={existingForm}
                  departments={departments}
                  allDoctors={doctors}
                  isSubmitting={existingForm.formState.isSubmitting}
                  onCancel={handleBack}
                  canSubmit
                />
                {submitError && <ErrorBanner message={submitError} />}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── Normal two-tab flow ──────────────────────────────────────────── */
        <Tabs value={tab} onValueChange={(v) => setTab(v as "existing" | "new")}>
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="existing" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Existing Patient
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              New Patient
            </TabsTrigger>
          </TabsList>

          {/* ── Existing patient tab ─────────────────────────────────────── */}
          <TabsContent value="existing" className="mt-6 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Select Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Patient <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPatientDropdownOpen((p) => !p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-input rounded-lg bg-background hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {selectedPatient ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                              {getInitials(selectedPatient.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <span className="font-medium block leading-tight">{selectedPatient.fullName}</span>
                            <span className="text-muted-foreground text-xs">
                              {calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex} · CNP: {selectedPatient.nationalId}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Search for a patient...</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform ${patientDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {patientDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              autoFocus
                              value={patientSearch}
                              onChange={(e) => setPatientSearch(e.target.value)}
                              placeholder="Search name, CNP, phone, email…"
                              className="w-full text-sm pl-8 pr-3 py-1.5 bg-transparent outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {filteredPatients.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No patients found</div>
                          ) : (
                            filteredPatients.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPatientId(p.id);
                                  setPatientDropdownOpen(false);
                                  setPatientSearch("");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                              >
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                    {getInitials(p.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.fullName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {calculateAge(p.dateOfBirth)} yrs · {p.sex} · CNP: {p.nationalId}
                                  </p>
                                </div>
                                {selectedPatientId === p.id && (
                                  <Check className="w-4 h-4 text-primary shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPatient && (
                  <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{selectedPatient.phone}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{selectedPatient.email}</span>
                    <span className="flex items-center gap-1.5"><Droplets className="w-3 h-3" />{selectedPatient.bloodType}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={existingForm.handleSubmit(onSubmitExisting)} className="space-y-5">
                  <AppointmentFields
                    form={existingForm}
                    departments={departments}
                    allDoctors={doctors}
                    isSubmitting={existingForm.formState.isSubmitting}
                    onCancel={handleBack}
                    canSubmit={!!selectedPatient}
                    submitLabel={selectedPatient ? "Schedule Appointment" : "Select a patient first"}
                  />
                  {submitError && <ErrorBanner message={submitError} />}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── New patient tab ────────────────────────────────────────────── */}
          <TabsContent value="new" className="mt-6">
            <form onSubmit={newPatientForm.handleSubmit(onSubmitNewPatient)} className="space-y-5">
              <div className="rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  This will register the patient in the system and book their first appointment simultaneously.
                </p>
              </div>

              {/* Personal information */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Personal Information</h2>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="fullName">Full name <span className="text-destructive">*</span></Label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Jane Elizabeth Smith"
                      {...newPatientForm.register("fullName")}
                      className={newPatientForm.formState.errors.fullName ? "border-destructive" : ""}
                    />
                    {newPatientForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{newPatientForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth">
                      <CalendarDays className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Date of birth <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...newPatientForm.register("dateOfBirth")}
                      className={newPatientForm.formState.errors.dateOfBirth ? "border-destructive" : ""}
                    />
                    {newPatientForm.formState.errors.dateOfBirth && (
                      <p className="text-xs text-destructive">{newPatientForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Sex <span className="text-destructive">*</span></Label>
                    <Select
                      value={newPatientForm.watch("sex")}
                      onValueChange={(v) => newPatientForm.setValue("sex", v as Sex)}
                    >
                      <SelectTrigger className={newPatientForm.formState.errors.sex ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="nationalId">
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      CNP (Personal Numeric Code) <span className="text-destructive">*</span>
                    </Label>
                    <CNPInput
                      id="nationalId"
                      value={newPatientForm.watch("nationalId") ?? ""}
                      onChange={(v) => newPatientForm.setValue("nationalId", v, { shouldValidate: true })}
                      onParsed={(result) => {
                        if (result.valid) {
                          if (result.dateOfBirth) newPatientForm.setValue("dateOfBirth", result.dateOfBirth, { shouldValidate: true });
                          if (result.sex) newPatientForm.setValue("sex", result.sex as Sex, { shouldValidate: true });
                        }
                      }}
                      error={newPatientForm.formState.errors.nationalId?.message}
                    />
                    {newPatientForm.formState.errors.nationalId && (
                      <p className="text-xs text-destructive">{newPatientForm.formState.errors.nationalId.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      <Droplets className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Blood type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={newPatientForm.watch("bloodType")}
                      onValueChange={(v) => newPatientForm.setValue("bloodType", v as BloodType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as BloodType[]).map((bt) => (
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact information */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
                  <Phone className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Contact Information</h2>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">
                      <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+40 700 000 000"
                      {...newPatientForm.register("phone")}
                      className={newPatientForm.formState.errors.phone ? "border-destructive" : ""}
                    />
                    {newPatientForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{newPatientForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      <Mail className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Email address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="patient@email.com"
                      {...newPatientForm.register("email")}
                      className={newPatientForm.formState.errors.email ? "border-destructive" : ""}
                    />
                    {newPatientForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{newPatientForm.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical information */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Medical Information</h2>
                  <Badge variant="outline" className="ml-auto text-[10px]">Optional</Badge>
                </div>
                <div className="p-5 space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="allergies">
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Known allergies
                    </Label>
                    <Textarea
                      id="allergies"
                      placeholder="e.g. Penicillin, Sulfonamides — or enter 'None known'"
                      rows={3}
                      {...newPatientForm.register("allergies")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currentMedications">
                      <Pill className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                      Current medications
                    </Label>
                    <Textarea
                      id="currentMedications"
                      placeholder="e.g. Lisinopril 10mg daily — or 'None'"
                      rows={3}
                      {...newPatientForm.register("currentMedications")}
                    />
                  </div>
                </div>
              </div>

              {/* Appointment details */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
                  <Clock className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Appointment Details</h2>
                </div>
                <div className="p-5">
                  <NewPatientAptFields form={newPatientForm} departments={departments} allDoctors={doctors} />
                </div>
              </div>

              {submitError && <ErrorBanner message={submitError} />}

              <div className="flex justify-end gap-3 pt-2 pb-6">
                <Button type="button" variant="outline" onClick={handleBack}>Cancel</Button>
                <Button type="submit" disabled={newPatientForm.formState.isSubmitting} className="gap-2 min-w-[180px]">
                  <UserPlus className="w-4 h-4" />
                  {newPatientForm.formState.isSubmitting ? "Saving…" : "Register & Schedule"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ── Shared doctor + appointment fields ───────────────────────────────────────

type DoctorItem = { id: string; name: string; specialty: string; departmentId: string };

function DoctorSelect({
  value,
  onChange,
  doctors,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  doctors: DoctorItem[];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        <Stethoscope className="w-3.5 h-3.5 inline mr-1 opacity-60" />
        Doctor <span className="text-destructive">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="Select a doctor…" />
        </SelectTrigger>
        <SelectContent>
          {doctors.length === 0 ? (
            <SelectItem value="_none" disabled>No doctors available</SelectItem>
          ) : (
            doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AppointmentFields({
  form,
  departments,
  allDoctors,
  isSubmitting,
  onCancel,
  canSubmit,
  submitLabel,
}: {
  form: ReturnType<typeof useForm<ExistingPatientForm>>;
  departments: Department[];
  allDoctors: DoctorItem[];
  isSubmitting: boolean;
  onCancel: () => void;
  canSubmit: boolean;
  submitLabel?: string;
}) {
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const filteredDoctors = selectedDeptId
    ? allDoctors.filter((d) => d.departmentId === selectedDeptId)
    : [];
  const selectedDoctorId = form.watch("doctorId");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Date <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("date")} />
          {form.formState.errors.date && (
            <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Time <span className="text-destructive">*</span></Label>
          <Select defaultValue={form.getValues("time") || "09:00"} onValueChange={(v) => form.setValue("time", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TIMES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.time && (
            <p className="text-xs text-destructive">{form.formState.errors.time.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <Building2 className="w-3.5 h-3.5 inline mr-1 opacity-60" />
          Specialty <span className="text-destructive">*</span>
        </Label>
        <Select
          value={selectedDeptId}
          onValueChange={(v) => {
            setSelectedDeptId(v);
            form.setValue("doctorId", "", { shouldValidate: false });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a specialty…" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDeptId && (
        <DoctorSelect
          value={form.watch("doctorId")}
          onChange={(v) => form.setValue("doctorId", v, { shouldValidate: true })}
          doctors={filteredDoctors}
          error={form.formState.errors.doctorId?.message}
        />
      )}

      {selectedDoctorId && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Appointment type <span className="text-destructive">*</span></Label>
          <Select defaultValue={form.getValues("type") || "General Consultation"} onValueChange={(v) => form.setValue("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <FileText className="w-3.5 h-3.5 inline mr-1 opacity-60" />
          Reason / Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input placeholder="e.g. Follow-up after emergency visit" {...form.register("notes")} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit} className="gap-2 min-w-[180px]">
          <CalendarDays className="w-4 h-4" />
          {isSubmitting ? "Scheduling…" : (submitLabel ?? "Schedule Appointment")}
        </Button>
      </div>
    </div>
  );
}

function NewPatientAptFields({
  form,
  departments,
  allDoctors,
}: {
  form: ReturnType<typeof useForm<NewPatientForm>>;
  departments: Department[];
  allDoctors: DoctorItem[];
}) {
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const filteredDoctors = selectedDeptId
    ? allDoctors.filter((d) => d.departmentId === selectedDeptId)
    : [];
  const selectedDoctorId = form.watch("doctorId");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Date <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("date")} />
          {form.formState.errors.date && (
            <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Time <span className="text-destructive">*</span></Label>
          <Select defaultValue={form.getValues("time") || "09:00"} onValueChange={(v) => form.setValue("time", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TIMES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <Building2 className="w-3.5 h-3.5 inline mr-1 opacity-60" />
          Specialty <span className="text-destructive">*</span>
        </Label>
        <Select
          value={selectedDeptId}
          onValueChange={(v) => {
            setSelectedDeptId(v);
            form.setValue("doctorId", "", { shouldValidate: false });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a specialty…" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDeptId && (
        <DoctorSelect
          value={form.watch("doctorId")}
          onChange={(v) => form.setValue("doctorId", v, { shouldValidate: true })}
          doctors={filteredDoctors}
          error={form.formState.errors.doctorId?.message}
        />
      )}

      {selectedDoctorId && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Appointment type <span className="text-destructive">*</span></Label>
          <Select defaultValue={form.getValues("type") || "General Consultation"} onValueChange={(v) => form.setValue("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <FileText className="w-3.5 h-3.5 inline mr-1 opacity-60" />
          Reason / Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input placeholder="e.g. First consultation" {...form.register("notes")} />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5">
      {message}
    </p>
  );
}
