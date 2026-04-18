import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { getInitials, calculateAge } from "@/lib/utils";
import type { BloodType, Sex } from "@/lib/types";

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
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  doctor: z.string().min(2, "Doctor name is required"),
  notes: z.string().optional(),
});

type ExistingPatientForm = z.infer<typeof existingPatientSchema>;

const newPatientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().min(1, "National ID is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]),
  allergies: z.string(),
  currentMedications: z.string(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  doctor: z.string().min(2, "Doctor name is required"),
  notes: z.string().optional(),
});

type NewPatientForm = z.infer<typeof newPatientSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface CreateAppointmentPageProps {
  onNavigate: (page: string) => void;
  /** If set, the patient is pre-selected (coming from patient detail page) */
  preselectedPatientId?: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CreateAppointmentPage({
  onNavigate,
  preselectedPatientId,
}: CreateAppointmentPageProps) {
  const patients = useAppStore((s) => s.patients);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const addPatient = useAppStore((s) => s.addPatient);
  const user = useAppStore((s) => s.user);

  const forceExisting = !!preselectedPatientId;
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    preselectedPatientId ?? null
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      date: today,
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
      notes: "",
    },
  });

  const newPatientForm = useForm<NewPatientForm>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      sex: "Male",
      bloodType: "Unknown",
      allergies: "",
      currentMedications: "",
      date: today,
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
      notes: "",
    },
  });

  const handleBack = () => {
    if (preselectedPatientId) {
      onNavigate(`patient-${preselectedPatientId}`);
    } else {
      onNavigate("appointments");
    }
  };

  const onSubmitExisting = async (data: ExistingPatientForm) => {
    if (!selectedPatient) return;
    await new Promise((r) => setTimeout(r, 300));
    addAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      date: data.date,
      time: data.time,
      type: data.type,
      doctor: data.doctor,
      status: "Scheduled",
    });
    setSubmitted(true);
    setTimeout(() => onNavigate("appointments"), 1200);
  };

  const onSubmitNewPatient = async (data: NewPatientForm) => {
    await new Promise((r) => setTimeout(r, 400));
    const newPatient = addPatient({
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
    addAppointment({
      patientId: newPatient.id,
      patientName: newPatient.fullName,
      date: data.date,
      time: data.time,
      type: data.type,
      doctor: data.doctor,
      status: "Scheduled",
    });
    setSubmitted(true);
    setTimeout(() => onNavigate("appointments"), 1200);
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
          {/* Patient card */}
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

          {/* Appointment form */}
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
                  isSubmitting={existingForm.formState.isSubmitting}
                  onCancel={handleBack}
                  canSubmit
                />
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
            {/* Patient picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Select Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Dropdown picker */}
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
                              {calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex} · ID: {selectedPatient.nationalId}
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
                              placeholder="Search name, ID, phone, email…"
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
                                    {calculateAge(p.dateOfBirth)} yrs · {p.sex} · ID: {p.nationalId}
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

                {/* Selected patient info strip */}
                {selectedPatient && (
                  <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{selectedPatient.phone}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{selectedPatient.email}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{selectedPatient.bloodType}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointment details */}
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
                    isSubmitting={existingForm.formState.isSubmitting}
                    onCancel={handleBack}
                    canSubmit={!!selectedPatient}
                    submitLabel={selectedPatient ? "Schedule Appointment" : "Select a patient first"}
                  />
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── New patient tab ────────────────────────────────────────────── */}
          <TabsContent value="new" className="mt-6">
            <form onSubmit={newPatientForm.handleSubmit(onSubmitNewPatient)} className="space-y-5">
              {/* Info banner */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  This will register the patient in the system and book their first appointment simultaneously.
                </p>
              </div>

              {/* Patient information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Full name <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. Jane Smith" {...newPatientForm.register("fullName")} />
                      {newPatientForm.formState.errors.fullName && (
                        <p className="text-xs text-destructive">{newPatientForm.formState.errors.fullName.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Date of birth <span className="text-destructive">*</span></Label>
                      <Input type="date" {...newPatientForm.register("dateOfBirth")} />
                      {newPatientForm.formState.errors.dateOfBirth && (
                        <p className="text-xs text-destructive">{newPatientForm.formState.errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Sex <span className="text-destructive">*</span></Label>
                      <Select defaultValue="Male" onValueChange={(v) => newPatientForm.setValue("sex", v as Sex)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">National ID <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. NH-78041201" {...newPatientForm.register("nationalId")} />
                      {newPatientForm.formState.errors.nationalId && (
                        <p className="text-xs text-destructive">{newPatientForm.formState.errors.nationalId.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Blood type <span className="text-destructive">*</span></Label>
                      <Select defaultValue="Unknown" onValueChange={(v) => newPatientForm.setValue("bloodType", v as BloodType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"] as BloodType[]).map((bt) => (
                            <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
                      <Input type="tel" placeholder="+1 (555) 000-0000" {...newPatientForm.register("phone")} />
                      {newPatientForm.formState.errors.phone && (
                        <p className="text-xs text-destructive">{newPatientForm.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                      <Input type="email" placeholder="patient@email.com" {...newPatientForm.register("email")} />
                      {newPatientForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{newPatientForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Allergies</Label>
                      <Input placeholder="e.g. Penicillin, None known" {...newPatientForm.register("allergies")} />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Current medications</Label>
                      <Input placeholder="e.g. Metformin 500mg, None" {...newPatientForm.register("currentMedications")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NewPatientAptFields form={newPatientForm} />
                </CardContent>
              </Card>

              {/* Actions */}
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

// ── Shared appointment fields component ──────────────────────────────────────

function AppointmentFields({
  form,
  isSubmitting,
  onCancel,
  canSubmit,
  submitLabel,
}: {
  form: ReturnType<typeof useForm<ExistingPatientForm>>;
  isSubmitting: boolean;
  onCancel: () => void;
  canSubmit: boolean;
  submitLabel?: string;
}) {
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

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Doctor <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Dr. Name" {...form.register("doctor")} />
        </div>
        {form.formState.errors.doctor && (
          <p className="text-xs text-destructive">{form.formState.errors.doctor.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Notes / Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="e.g. Follow-up after emergency visit" {...form.register("notes")} />
        </div>
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

// ── Appointment fields for new-patient form ───────────────────────────────────

function NewPatientAptFields({ form }: { form: ReturnType<typeof useForm<NewPatientForm>> }) {
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

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Doctor <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Dr. Name" {...form.register("doctor")} />
        </div>
        {form.formState.errors.doctor && (
          <p className="text-xs text-destructive">{form.formState.errors.doctor.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Notes / Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="e.g. First consultation" {...form.register("notes")} />
        </div>
      </div>
    </div>
  );
}
