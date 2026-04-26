import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDays,
  UserPlus,
  Search,
  Check,
  ChevronDown,
  User,
  Phone,
  Mail,
  Building2,
  Stethoscope,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useAppStore } from "@/lib/store";
import { getInitials, calculateAge } from "@/lib/utils";
import type { BloodType, Sex, Doctor, Department } from "@/lib/types";

// ── Appointment types ──────────────────────────────────────────────────────
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

// ── Available slots hook ─────────────────────────────────────────────────────

function useAvailableSlots(doctorId: string | undefined, date: string | undefined) {
  const [slots, setSlots] = useState<string[]>(APPOINTMENT_TIMES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots(APPOINTMENT_TIMES);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    api
      .get<{ slots: string[] }>(`/api/doctors/${doctorId}/schedule/available-slots?date=${date}`)
      .then((res) => { if (!cancelled) setSlots(res.slots); })
      .catch(() => { if (!cancelled) setSlots(APPOINTMENT_TIMES); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [doctorId, date]);

  return { slots, isLoading };
}

// ── Schema for an appointment with an existing patient ──────────────────────
const existingPatientAptSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  doctor: z.string().min(2, "Doctor name is required"),
  notes: z.string().optional(),
});

type ExistingPatientAptForm = z.infer<typeof existingPatientAptSchema>;

// ── Schema for a new patient + appointment ──────────────────────────────────
const newPatientAptSchema = z.object({
  // Patient fields
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().min(1, "National ID is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]),
  allergies: z.string(),
  currentMedications: z.string(),
  // Appointment fields
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  doctor: z.string().min(2, "Doctor name is required"),
  notes: z.string().optional(),
});

type NewPatientAptForm = z.infer<typeof newPatientAptSchema>;

// ── Props ───────────────────────────────────────────────────────────────────
interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a specific patient (e.g. when opened from patient detail page) */
  preselectedPatientId?: string;
  onSuccess?: () => void;
}

export default function CreateAppointmentDialog({
  open,
  onOpenChange,
  preselectedPatientId,
  onSuccess,
}: CreateAppointmentDialogProps) {
  const patients = useAppStore((s) => s.patients);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const addPatient = useAppStore((s) => s.addPatient);
  const user = useAppStore((s) => s.user);
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);

  const [tab, setTab] = useState<"existing" | "new">(
    preselectedPatientId ? "existing" : "existing"
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    preselectedPatientId ?? null
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [selectedDeptIdExisting, setSelectedDeptIdExisting] = useState("");
  const [selectedDeptIdNew, setSelectedDeptIdNew] = useState("");

  useEffect(() => {
    if (open) {
      if (doctors.length === 0) void fetchDoctors();
      if (departments.length === 0) void fetchDepartments();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Form for existing patient ──────────────────────────────────────────
  const existingForm = useForm<ExistingPatientAptForm>({
    resolver: zodResolver(existingPatientAptSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
    },
  });

  // ── Form for new patient ───────────────────────────────────────────────
  const newPatientForm = useForm<NewPatientAptForm>({
    resolver: zodResolver(newPatientAptSchema),
    defaultValues: {
      sex: "Male",
      bloodType: "Unknown",
      allergies: "",
      currentMedications: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    existingForm.reset({
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
    });
    newPatientForm.reset({
      sex: "Male",
      bloodType: "Unknown",
      allergies: "",
      currentMedications: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      type: "General Consultation",
      doctor: user?.name ?? "",
    });
    if (!preselectedPatientId) setSelectedPatientId(null);
    setPatientSearch("");
    setPatientDropdownOpen(false);
    setSelectedDeptIdExisting("");
    setSelectedDeptIdNew("");
  };

  const onSubmitExisting = async (data: ExistingPatientAptForm) => {
    if (!selectedPatient) return;
    await new Promise((r) => setTimeout(r, 400));
    addAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      date: data.date,
      time: data.time,
      type: data.type,
      doctor: data.doctor,
      status: "Scheduled",
    });
    handleClose();
    onSuccess?.();
  };

  const onSubmitNewPatient = async (data: NewPatientAptForm) => {
    await new Promise((r) => setTimeout(r, 500));
    // First create the patient
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
    // Then create appointment for them
    addAppointment({
      patientId: newPatient.id,
      patientName: newPatient.fullName,
      date: data.date,
      time: data.time,
      type: data.type,
      doctor: data.doctor,
      status: "Scheduled",
    });
    handleClose();
    onSuccess?.();
  };

  // If a patient is preselected, force the "existing" tab and disable switching
  const forceExisting = !!preselectedPatientId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Schedule Appointment
          </DialogTitle>
        </DialogHeader>

        {forceExisting ? (
          // ── Pre-selected patient — skip patient selection entirely ──────
          <div className="space-y-5 py-1">
            {/* Patient info banner */}
            {selectedPatient && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                    {getInitials(selectedPatient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedPatient.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex} · {selectedPatient.bloodType}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">Selected</Badge>
              </div>
            )}
            <AppointmentFields
              form={existingForm}
              departments={departments}
              doctors={doctors}
              selectedDeptId={selectedDeptIdExisting}
              onDeptChange={(id) => {
                setSelectedDeptIdExisting(id);
                existingForm.setValue("doctor", "");
              }}
              isSubmitting={existingForm.formState.isSubmitting}
              onSubmit={existingForm.handleSubmit(onSubmitExisting)}
              onCancel={handleClose}
              canSubmit={!!selectedPatient}
            />
          </div>
        ) : (
          // ── Normal flow with tabs ─────────────────────────────────────
          <Tabs value={tab} onValueChange={(v) => setTab(v as "existing" | "new")} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="existing" className="gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Existing Patient
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                New Patient
              </TabsTrigger>
            </TabsList>

            {/* ── Existing patient tab ─────────────────────────────── */}
            <TabsContent value="existing" className="space-y-4 mt-0">
              {/* Patient search/select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Patient <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPatientDropdownOpen((p) => !p)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {selectedPatient ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                            {getInitials(selectedPatient.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedPatient.fullName}</span>
                        <span className="text-muted-foreground text-xs">
                          · {calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Search for a patient...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </button>

                  {patientDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            autoFocus
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            placeholder="Search name, ID, phone, email..."
                            className="w-full text-sm pl-8 pr-3 py-1.5 bg-transparent outline-none"
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredPatients.length === 0 ? (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            No patients found
                          </div>
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
                {!selectedPatient && existingForm.formState.isSubmitted && (
                  <p className="text-xs text-destructive">Please select a patient</p>
                )}
              </div>

              {/* Selected patient detail banner */}
              {selectedPatient && (
                <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {selectedPatient.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> {selectedPatient.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3" /> {selectedPatient.bloodType}
                  </span>
                </div>
              )}

              <AppointmentFields
                form={existingForm}
                departments={departments}
                doctors={doctors}
                selectedDeptId={selectedDeptIdExisting}
                onDeptChange={(id) => {
                  setSelectedDeptIdExisting(id);
                  existingForm.setValue("doctor", "");
                }}
                isSubmitting={existingForm.formState.isSubmitting}
                onSubmit={existingForm.handleSubmit(onSubmitExisting)}
                onCancel={handleClose}
                canSubmit={!!selectedPatient}
              />
            </TabsContent>

            {/* ── New patient tab ──────────────────────────────────── */}
            <TabsContent value="new" className="space-y-4 mt-0">
              <div className="rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  This will register the patient in the system and schedule their first appointment.
                </p>
              </div>

              <form onSubmit={newPatientForm.handleSubmit(onSubmitNewPatient)} className="space-y-4">
                {/* Patient info section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">
                    Patient Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Full name <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="e.g. Jane Smith"
                        {...newPatientForm.register("fullName")}
                      />
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
                      <Select
                        defaultValue="Male"
                        onValueChange={(v) => newPatientForm.setValue("sex", v as Sex)}
                      >
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
                      <Select
                        defaultValue="Unknown"
                        onValueChange={(v) => newPatientForm.setValue("bloodType", v as BloodType)}
                      >
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
                </div>

                {/* Appointment section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">
                    Appointment Details
                  </h3>
                  <NewPatientAptFields
                    form={newPatientForm}
                    departments={departments}
                    doctors={doctors}
                    selectedDeptId={selectedDeptIdNew}
                    onDeptChange={(id) => {
                      setSelectedDeptIdNew(id);
                      newPatientForm.setValue("doctor", "");
                    }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" disabled={newPatientForm.formState.isSubmitting} className="gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    {newPatientForm.formState.isSubmitting ? "Saving..." : "Register & Schedule"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Shared appointment fields for existing-patient form ─────────────────────
function AppointmentFields({
  form,
  departments,
  doctors,
  selectedDeptId,
  onDeptChange,
  isSubmitting,
  onSubmit,
  onCancel,
  canSubmit,
}: {
  form: ReturnType<typeof useForm<ExistingPatientAptForm>>;
  departments: Department[];
  doctors: Doctor[];
  selectedDeptId: string;
  onDeptChange: (id: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  canSubmit: boolean;
}) {
  const filteredDoctors = selectedDeptId
    ? doctors.filter((d) => d.departmentId === selectedDeptId)
    : [];
  const selectedDoctor = form.watch("doctor");
  const selectedDoctorId = doctors.find((d) => d.name === selectedDoctor)?.id;
  const watchedDate = form.watch("date");
  const { slots, isLoading: slotsLoading } = useAvailableSlots(selectedDoctorId, watchedDate);

  useEffect(() => {
    const currentTime = form.getValues("time");
    if (currentTime && slots.length > 0 && !slots.includes(currentTime)) {
      form.setValue("time", "");
    }
  }, [slots, form]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">
          Appointment Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
            <Input type="date" {...form.register("date")} />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Time <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("time") || ""}
              onValueChange={(v) => form.setValue("time", v)}
              disabled={slotsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={slotsLoading ? "Loading slots…" : "Select time…"} />
                {slotsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-muted-foreground" />}
              </SelectTrigger>
              <SelectContent>
                {slots.length === 0
                  ? <div className="px-2 py-4 text-center text-sm text-muted-foreground">No available slots for this date</div>
                  : slots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            <Building2 className="w-3 h-3 inline mr-1 opacity-60" />
            Specialty <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedDeptId} onValueChange={onDeptChange}>
            <SelectTrigger><SelectValue placeholder="Select a specialty…" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDeptId && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              <Stethoscope className="w-3 h-3 inline mr-1 opacity-60" />
              Doctor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("doctor")}
              onValueChange={(v) => form.setValue("doctor", v, { shouldValidate: true })}
            >
              <SelectTrigger className={form.formState.errors.doctor ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a doctor…" />
              </SelectTrigger>
              <SelectContent>
                {filteredDoctors.length === 0 ? (
                  <SelectItem value="_none" disabled>No doctors in this department</SelectItem>
                ) : (
                  filteredDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name} — {d.specialty}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.doctor && (
              <p className="text-xs text-destructive">{form.formState.errors.doctor.message}</p>
            )}
          </div>
        )}

        {selectedDoctor && (
          <div className="space-y-1.5">
            <Label className="text-xs">Appointment type <span className="text-destructive">*</span></Label>
            <Select
              defaultValue={form.getValues("type") || "General Consultation"}
              onValueChange={(v) => form.setValue("type", v)}
            >
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
          <Label className="text-xs">Notes / Reason (optional)</Label>
          <Input placeholder="e.g. Follow-up after emergency visit" {...form.register("notes")} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit} className="gap-1.5">
          <CalendarDays className="w-4 h-4" />
          {isSubmitting ? "Scheduling..." : "Schedule Appointment"}
        </Button>
      </div>
    </form>
  );
}

// ── Appointment fields within new-patient form ──────────────────────────────
function NewPatientAptFields({
  form,
  departments,
  doctors,
  selectedDeptId,
  onDeptChange,
}: {
  form: ReturnType<typeof useForm<NewPatientAptForm>>;
  departments: Department[];
  doctors: Doctor[];
  selectedDeptId: string;
  onDeptChange: (id: string) => void;
}) {
  const filteredDoctors = selectedDeptId
    ? doctors.filter((d) => d.departmentId === selectedDeptId)
    : [];
  const selectedDoctor = form.watch("doctor");
  const selectedDoctorId = doctors.find((d) => d.name === selectedDoctor)?.id;
  const watchedDate = form.watch("date");
  const { slots, isLoading: slotsLoading } = useAvailableSlots(selectedDoctorId, watchedDate);

  useEffect(() => {
    const currentTime = form.getValues("time");
    if (currentTime && slots.length > 0 && !slots.includes(currentTime)) {
      form.setValue("time", "");
    }
  }, [slots, form]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
          <Input type="date" {...form.register("date")} />
          {form.formState.errors.date && (
            <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time <span className="text-destructive">*</span></Label>
          <Select
            value={form.watch("time") || ""}
            onValueChange={(v) => form.setValue("time", v)}
            disabled={slotsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={slotsLoading ? "Loading slots…" : "Select time…"} />
              {slotsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-muted-foreground" />}
            </SelectTrigger>
            <SelectContent>
              {slots.length === 0
                ? <div className="px-2 py-4 text-center text-sm text-muted-foreground">No available slots for this date</div>
                : slots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          <Building2 className="w-3 h-3 inline mr-1 opacity-60" />
          Specialty <span className="text-destructive">*</span>
        </Label>
        <Select value={selectedDeptId} onValueChange={onDeptChange}>
          <SelectTrigger><SelectValue placeholder="Select a specialty…" /></SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDeptId && (
        <div className="space-y-1.5">
          <Label className="text-xs">
            <Stethoscope className="w-3 h-3 inline mr-1 opacity-60" />
            Doctor <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.watch("doctor")}
            onValueChange={(v) => form.setValue("doctor", v, { shouldValidate: true })}
          >
            <SelectTrigger className={form.formState.errors.doctor ? "border-destructive" : ""}>
              <SelectValue placeholder="Select a doctor…" />
            </SelectTrigger>
            <SelectContent>
              {filteredDoctors.length === 0 ? (
                <SelectItem value="_none" disabled>No doctors in this department</SelectItem>
              ) : (
                filteredDoctors.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name} — {d.specialty}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.doctor && (
            <p className="text-xs text-destructive">{form.formState.errors.doctor.message}</p>
          )}
        </div>
      )}

      {selectedDoctor && (
        <div className="space-y-1.5">
          <Label className="text-xs">Appointment type <span className="text-destructive">*</span></Label>
          <Select
            defaultValue={form.getValues("type") || "General Consultation"}
            onValueChange={(v) => form.setValue("type", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Notes / Reason (optional)</Label>
        <Input placeholder="e.g. First consultation" {...form.register("notes")} />
      </div>
    </div>
  );
}
