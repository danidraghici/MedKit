import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Phone, Mail, Droplets, Calendar, User, Pill, AlertTriangle, CreditCard,
  Plus, FileText, FlaskConical, StickyNote, ClipboardList, Clock, Stethoscope,
  Upload, X, Download, Paperclip, Edit, Trash2, Activity, Heart, Thermometer,
  Wind, Eye, Weight, ChevronDown, ChevronUp, BookOpen, UserCheck, AlertCircle,
  CalendarDays, CheckCircle2, XCircle, MoreVertical, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { formatDate, formatDateTime, calculateAge, getInitials, formatFileSize } from "@/lib/utils";
import type { Attachment, PrescribedDrug, RouteOfAdministration, DrugFrequency, UrgencyLevel, FollowUpType } from "@/lib/types";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const drugSchema = z.object({
  name: z.string().min(1, "Drug name required"),
  genericName: z.string().optional(),
  dose: z.string().min(1, "Dose required"),
  route: z.string().min(1, "Route required"),
  frequency: z.string().min(1, "Frequency required"),
  duration: z.string().min(1, "Duration required"),
  quantity: z.string().optional(),
  refills: z.string().optional(),
  instructions: z.string().optional(),
  indication: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const medicalRecordSchema = z.object({
  date: z.string().min(1, "Date required"),
  doctor: z.string().min(2, "Doctor name required"),
  visitType: z.enum(["In-person", "Telemedicine", "Emergency", "Follow-up", "Procedure"]),
  chiefComplaint: z.string().min(2, "Chief complaint required"),
  diagnosis: z.string().min(2, "Diagnosis required"),
  icdCode: z.string().optional(),
  secondaryDiagnoses: z.string().optional(),
  symptoms: z.string().min(2, "Symptoms required"),
  physicalExam: z.string().optional(),
  bp: z.string().optional(),
  hr: z.string().optional(),
  temp: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  treatment: z.string().min(2, "Treatment plan required"),
  prescribedDrugs: z.array(drugSchema),
  procedures: z.string().optional(),
  urgency: z.enum(["Routine", "Semi-urgent", "Urgent", "Emergency"]),
  followUpIn: z.string().optional(),
  followUpType: z.string().optional(),
  referral: z.string().optional(),
  patientEducation: z.string().optional(),
});

const noteSchema = z.object({
  content: z.string().min(5, "Note must be at least 5 characters"),
});

const labResultSchema = z.object({
  date: z.string().min(1, "Date required"),
  testName: z.string().min(2, "Test name required"),
  result: z.string().min(1, "Result required"),
  unit: z.string(),
  referenceRange: z.string().min(1, "Reference range required"),
  status: z.enum(["Normal", "Abnormal", "Critical"]),
  notes: z.string(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;
type NoteFormData = z.infer<typeof noteSchema>;
type LabResultFormData = z.infer<typeof labResultSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTES: RouteOfAdministration[] = ["Oral","IV","IM","Subcutaneous","Topical","Inhalation","Sublingual","Rectal","Nasal","Ophthalmic","Other"];
const FREQUENCIES: DrugFrequency[] = ["Once daily","Twice daily","Three times daily","Four times daily","Every 4 hours","Every 6 hours","Every 8 hours","Every 12 hours","Every 24 hours","PRN (as needed)","Weekly","Biweekly","Monthly","Single dose","Other"];
const URGENCY_LEVELS: UrgencyLevel[] = ["Routine","Semi-urgent","Urgent","Emergency"];
const FOLLOW_UP_TYPES: FollowUpType[] = ["Office visit","Phone call","Lab work","Imaging","Specialist referral","ER if symptoms worsen","None"];
const VISIT_TYPES = ["In-person","Telemedicine","Emergency","Follow-up","Procedure"] as const;

const urgencyConfig: Record<UrgencyLevel, { color: string; badge: "default" | "secondary" | "outline" }> = {
  Routine:     { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800", badge: "secondary" },
  "Semi-urgent": { color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800", badge: "secondary" },
  Urgent:      { color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", badge: "secondary" },
  Emergency:   { color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800", badge: "secondary" },
};

const routeBadgeColor: Record<string, string> = {
  Oral: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  IV:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  IM:   "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  Subcutaneous: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  Topical: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  Inhalation: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
};

// ─── FormField helper ─────────────────────────────────────────────────────────

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── DrugCard displayed in timeline ───────────────────────────────────────────

function DrugCard({ drug }: { drug: PrescribedDrug }) {
  const [expanded, setExpanded] = useState(false);
  const routeColor = routeBadgeColor[drug.route] ?? "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Pill className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{drug.name}</span>
            {drug.genericName && drug.genericName !== drug.name && (
              <span className="text-xs text-muted-foreground">({drug.genericName})</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${routeColor}`}>{drug.route}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{drug.dose}</span>
            <span>·</span>
            <span>{drug.frequency}</span>
            <span>·</span>
            <span>{drug.duration}</span>
            {drug.quantity && <><span>·</span><span>{drug.quantity}</span></>}
          </div>
          {drug.indication && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">For: {drug.indication}</p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-2.5 bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {drug.refills && (
              <div>
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Refills</p>
                <p>{drug.refills}</p>
              </div>
            )}
            {drug.startDate && (
              <div>
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Start date</p>
                <p>{formatDate(drug.startDate)}</p>
              </div>
            )}
            {drug.endDate && (
              <div>
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">End date</p>
                <p>{formatDate(drug.endDate)}</p>
              </div>
            )}
          </div>
          {drug.instructions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Special instructions
              </p>
              <p className="text-sm bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg px-3 py-2 text-yellow-900 dark:text-yellow-300">
                ⚠️ {drug.instructions}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Prescribed by: <strong>{drug.prescribedBy}</strong></p>
        </div>
      )}
    </div>
  );
}

// ─── VitalSignsGrid ───────────────────────────────────────────────────────────

function VitalSignsGrid({ vs }: { vs: NonNullable<import("@/lib/types").MedicalRecord["vitalSigns"]> }) {
  const items = [
    { icon: <Activity className="w-3.5 h-3.5" />, label: "BP", value: vs.bloodPressure, unit: "mmHg" },
    { icon: <Heart className="w-3.5 h-3.5" />, label: "HR", value: vs.heartRate, unit: "" },
    { icon: <Thermometer className="w-3.5 h-3.5" />, label: "Temp", value: vs.temperature, unit: "" },
    { icon: <Wind className="w-3.5 h-3.5" />, label: "RR", value: vs.respiratoryRate, unit: "" },
    { icon: <Eye className="w-3.5 h-3.5" />, label: "SpO₂", value: vs.oxygenSaturation, unit: "" },
    { icon: <Weight className="w-3.5 h-3.5" />, label: "Weight", value: vs.weight, unit: "" },
    { icon: <User className="w-3.5 h-3.5" />, label: "Height", value: vs.height, unit: "" },
  ].filter((i) => i.value);

  if (!items.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vital Signs</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center bg-muted/40 rounded-xl p-2.5 border border-border gap-1">
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="text-sm font-bold">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DrugRow in the add-record form ───────────────────────────────────────────

function DrugFormRow({
  index, register, errors, remove, setValue, getValues,
}: {
  index: number;
  register: ReturnType<typeof useForm<MedicalRecordFormData>>["register"];
  errors: ReturnType<typeof useForm<MedicalRecordFormData>>["formState"]["errors"];
  remove: (i: number) => void;
  setValue: ReturnType<typeof useForm<MedicalRecordFormData>>["setValue"];
  getValues: ReturnType<typeof useForm<MedicalRecordFormData>>["getValues"];
}) {
  const [expanded, setExpanded] = useState(true);
  const drugErrors = errors.prescribedDrugs?.[index];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
        <Pill className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium flex-1">Drug #{index + 1}</span>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => remove(index)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Row 1: Name + Generic name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Drug name" required error={drugErrors?.name?.message}>
              <Input {...register(`prescribedDrugs.${index}.name`)} placeholder="e.g. Tamsulosin" />
            </FormField>
            <FormField label="Generic name" error={drugErrors?.genericName?.message}>
              <Input {...register(`prescribedDrugs.${index}.genericName`)} placeholder="e.g. Tamsulosin HCl" />
            </FormField>
          </div>

          {/* Row 2: Dose + Route + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Dose" required error={drugErrors?.dose?.message}>
              <Input {...register(`prescribedDrugs.${index}.dose`)} placeholder="e.g. 0.4mg" />
            </FormField>
            <FormField label="Route" required error={drugErrors?.route?.message}>
              <Select
                defaultValue={getValues(`prescribedDrugs.${index}.route`) || "Oral"}
                onValueChange={(v) => setValue(`prescribedDrugs.${index}.route`, v as RouteOfAdministration)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Frequency" required error={drugErrors?.frequency?.message}>
              <Select
                defaultValue={getValues(`prescribedDrugs.${index}.frequency`) || "Once daily"}
                onValueChange={(v) => setValue(`prescribedDrugs.${index}.frequency`, v as DrugFrequency)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Row 3: Duration + Quantity + Refills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Duration" required error={drugErrors?.duration?.message}>
              <Input {...register(`prescribedDrugs.${index}.duration`)} placeholder="e.g. 7 days, Ongoing" />
            </FormField>
            <FormField label="Quantity" error={drugErrors?.quantity?.message}>
              <Input {...register(`prescribedDrugs.${index}.quantity`)} placeholder="e.g. 30 tablets" />
            </FormField>
            <FormField label="Refills" error={drugErrors?.refills?.message}>
              <Input {...register(`prescribedDrugs.${index}.refills`)} placeholder="e.g. No refills" />
            </FormField>
          </div>

          {/* Row 4: Start + End date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Start date" error={drugErrors?.startDate?.message}>
              <Input type="date" {...register(`prescribedDrugs.${index}.startDate`)} />
            </FormField>
            <FormField label="End date" error={drugErrors?.endDate?.message}>
              <Input type="date" {...register(`prescribedDrugs.${index}.endDate`)} />
            </FormField>
          </div>

          {/* Row 5: Indication */}
          <FormField label="Indication (reason for prescribing)" error={drugErrors?.indication?.message}>
            <Input {...register(`prescribedDrugs.${index}.indication`)} placeholder="e.g. Renal colic pain management" />
          </FormField>

          {/* Row 6: Special instructions */}
          <FormField label="Special instructions" error={drugErrors?.instructions?.message}>
            <Textarea
              {...register(`prescribedDrugs.${index}.instructions`)}
              placeholder="e.g. Take with food. Avoid NSAIDs. Monitor renal function."
              rows={2}
            />
          </FormField>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PatientDetailPageProps {
  patientId: string;
  onNavigate: (page: string) => void;
}

export default function PatientDetailPage({ patientId, onNavigate }: PatientDetailPageProps) {
  const getPatient = useAppStore((s) => s.getPatient);
  const getMedicalRecords = useAppStore((s) => s.getMedicalRecords);
  const getLabResults = useAppStore((s) => s.getLabResults);
  const getNotes = useAppStore((s) => s.getNotes);
  const getPatientAppointments = useAppStore((s) => s.getPatientAppointments);
  const updateAppointmentStatus = useAppStore((s) => s.updateAppointmentStatus);
  const addMedicalRecord = useAppStore((s) => s.addMedicalRecord);
  const addNote = useAppStore((s) => s.addNote);
  const addLabResult = useAppStore((s) => s.addLabResult);
  const user = useAppStore((s) => s.user);

  // Role-based permissions
  const isLabDoctor = user?.role === "lab_doctor";
  const isSpecialist = user?.role === "specialist_doctor";
  const isAdmin = user?.role === "admin";
  // Lab doctor: can only upload lab results
  // Specialist / admin: can add records, appointments, notes, medications — but NOT edit lab results
  const canAddLabResults = isLabDoctor || isSpecialist || isAdmin;
  const canAddRecords = isSpecialist || isAdmin;
  const canAddNotes = isSpecialist || isAdmin;
  const canScheduleAppointments = isSpecialist || isAdmin;

  // Lab-result add form state
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);

  const patient = getPatient(patientId);
  const medicalRecords = getMedicalRecords(patientId);
  const labResults = getLabResults(patientId);
  const notes = getNotes(patientId);
  const patientAppointments = getPatientAppointments(patientId);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit, reset, setValue, getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      visitType: "In-person",
      urgency: "Routine",
      prescribedDrugs: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "prescribedDrugs" });

  const {
    register: registerNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNote,
    formState: { errors: noteErrors, isSubmitting: isNoteSubmitting },
  } = useForm<NoteFormData>({ resolver: zodResolver(noteSchema) });

  const {
    register: registerLab,
    handleSubmit: handleLabSubmit,
    reset: resetLab,
    setValue: setLabValue,
    watch: watchLab,
    formState: { errors: labErrors, isSubmitting: isLabSubmitting },
  } = useForm<LabResultFormData>({
    resolver: zodResolver(labResultSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      status: "Normal",
      unit: "",
      notes: "",
    },
  });

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => onNavigate("patients")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to patients
        </Button>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            url: event.target?.result as string,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const closeModal = () => {
    setIsRecordModalOpen(false);
    reset({ date: new Date().toISOString().split("T")[0], visitType: "In-person", urgency: "Routine", prescribedDrugs: [] });
    setAttachments([]);
  };

  const onAddRecord = async (data: MedicalRecordFormData) => {
    await new Promise((r) => setTimeout(r, 400));
    addMedicalRecord({
      patientId,
      date: data.date,
      doctor: data.doctor,
      visitType: data.visitType,
      chiefComplaint: data.chiefComplaint,
      diagnosis: data.diagnosis,
      icdCode: data.icdCode,
      secondaryDiagnoses: data.secondaryDiagnoses,
      symptoms: data.symptoms,
      physicalExam: data.physicalExam,
      vitalSigns: {
        bloodPressure: data.bp,
        heartRate: data.hr,
        temperature: data.temp,
        respiratoryRate: data.rr,
        oxygenSaturation: data.spo2,
        weight: data.weight,
        height: data.height,
      },
      treatment: data.treatment,
      prescribedDrugs: (data.prescribedDrugs ?? []).map((d, i) => ({
        ...d,
        id: `d-${Date.now()}-${i}`,
        route: d.route as RouteOfAdministration,
        frequency: d.frequency as DrugFrequency,
        prescribedBy: user?.name ?? data.doctor,
      })),
      procedures: data.procedures,
      urgency: data.urgency,
      followUpIn: data.followUpIn,
      followUpType: data.followUpType as FollowUpType | undefined,
      referral: data.referral,
      patientEducation: data.patientEducation,
      attachments,
    });
    closeModal();
  };

  const onAddNote = async (data: NoteFormData) => {
    await new Promise((r) => setTimeout(r, 300));
    addNote({ patientId, date: new Date().toISOString(), author: user?.name ?? "Unknown", content: data.content });
    setIsNoteModalOpen(false);
    resetNote();
  };

  const onAddLabResult = async (data: LabResultFormData) => {
    await new Promise((r) => setTimeout(r, 300));
    addLabResult({
      patientId,
      date: data.date,
      testName: data.testName,
      result: data.result,
      unit: data.unit,
      referenceRange: data.referenceRange,
      status: data.status,
      notes: data.notes,
    });
    setIsLabModalOpen(false);
    resetLab({ date: new Date().toISOString().split("T")[0], status: "Normal", unit: "", notes: "" });
  };

  const downloadAttachment = (att: Attachment) => {
    const a = document.createElement("a");
    a.href = att.url;
    a.download = att.name;
    a.click();
  };

  const age = calculateAge(patient.dateOfBirth);

  const statusBadge: Record<string, "default" | "secondary" | "outline"> = {
    Normal: "secondary", Abnormal: "secondary", Critical: "outline",
  };

  const addEmptyDrug = () => {
    append({
      name: "", genericName: "", dose: "", route: "Oral", frequency: "Once daily",
      duration: "", quantity: "", refills: "", instructions: "", indication: "",
      startDate: new Date().toISOString().split("T")[0], endDate: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" className="gap-1.5 -ml-2 text-sm" onClick={() => onNavigate("patients")}>
        <ArrowLeft className="w-4 h-4" /> Back to patients
      </Button>

      {/* Patient Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
          <Avatar className="w-20 h-20 shrink-0">
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {getInitials(patient.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{patient.fullName}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {age} years old · {patient.sex} · DOB: {formatDate(patient.dateOfBirth)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="solid" accent="info" className="text-sm px-3 py-1">
                  <Droplets className="w-3.5 h-3.5 mr-1" />{patient.bloodType}
                </Badge>
                {isLabDoctor && (
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-400 gap-1.5">
                    <FlaskConical className="w-3 h-3" />Lab access only
                  </Badge>
                )}
                {canAddRecords && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate(`edit-patient-${patientId}`)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />Edit Patient
                  </Button>
                )}
                {canScheduleAppointments && (
                  <Button
                    size="sm"
                    onClick={() => onNavigate(`create-appointment-patient-${patientId}`)}
                    className="gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />Schedule Appointment
                  </Button>
                )}
                {canAddLabResults && isLabDoctor && (
                  <Button size="sm" variant="outline" onClick={() => setIsLabModalOpen(true)} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" />Upload Lab Result
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0 text-primary/70" />{patient.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0 text-primary/70" />{patient.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4 shrink-0 text-primary/70" />{patient.nationalId}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {patient.allergies && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <span className="text-xs text-destructive font-medium">Allergies: {patient.allergies}</span>
                </div>
              )}
              {patient.currentMedications && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                  <Pill className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Meds: {patient.currentMedications}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isLabDoctor ? "lab-results" : "medical-history"} className="space-y-4">
        <TabsList className={`grid w-full ${isLabDoctor ? "grid-cols-2" : "grid-cols-5"}`}>
          {!isLabDoctor && (
            <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5" /><span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
          )}
          {!isLabDoctor && (
            <TabsTrigger value="medical-history" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="w-3.5 h-3.5" /><span className="hidden sm:inline">History</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="lab-results" className="gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="w-3.5 h-3.5" /><span className="hidden sm:inline">Labs</span>
          </TabsTrigger>
          {!isLabDoctor && (
            <TabsTrigger value="appointments" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5" /><span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
          )}
          {!isLabDoctor && (
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
              <StickyNote className="w-3.5 h-3.5" /><span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          )}
          {isLabDoctor && (
            <TabsTrigger value="patient-info" className="gap-1.5 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5" /><span className="hidden sm:inline">Patient Info</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Personal ── */}
        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Full name", value: patient.fullName, icon: <User className="w-4 h-4" /> },
                  { label: "Date of birth", value: formatDate(patient.dateOfBirth), icon: <Calendar className="w-4 h-4" /> },
                  { label: "Age", value: `${age} years old`, icon: <User className="w-4 h-4" /> },
                  { label: "Sex", value: patient.sex, icon: <User className="w-4 h-4" /> },
                  { label: "National ID", value: patient.nationalId, icon: <CreditCard className="w-4 h-4" /> },
                  { label: "Blood type", value: patient.bloodType, icon: <Droplets className="w-4 h-4" /> },
                  { label: "Phone", value: patient.phone, icon: <Phone className="w-4 h-4" /> },
                  { label: "Email", value: patient.email, icon: <Mail className="w-4 h-4" /> },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      {item.icon}{item.label}
                    </p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />Allergies
                  </p>
                  <p className="text-sm font-medium">{patient.allergies || "None documented"}</p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Pill className="w-4 h-4" />Current medications
                  </p>
                  <p className="text-sm font-medium">{patient.currentMedications || "None documented"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lab Doctor: Patient Info tab ── */}
        {isLabDoctor && (
          <TabsContent value="patient-info">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
                <FlaskConical className="w-4 h-4 shrink-0" />
                <span>As a lab doctor, you have read-only access to patient information and can upload lab results.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Full name", value: patient.fullName },
                  { label: "Date of birth", value: formatDate(patient.dateOfBirth) },
                  { label: "Sex", value: patient.sex },
                  { label: "Blood type", value: patient.bloodType },
                  { label: "National ID", value: patient.nationalId },
                  { label: "Phone", value: patient.phone },
                  { label: "Email", value: patient.email },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
                {patient.allergies && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Allergies</p>
                    <p className="font-medium text-destructive">{patient.allergies}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Medical History ── */}
        <TabsContent value="medical-history" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Medical History Timeline
            </h3>
            {canAddRecords && (
              <Button size="sm" onClick={() => setIsRecordModalOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />Add record
              </Button>
            )}
          </div>

          {medicalRecords.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No medical records yet</EmptyTitle>
                <EmptyDescription>Add the first medical record for this patient.</EmptyDescription>
              </EmptyHeader>
              {canAddRecords && (
                <EmptyContent>
                  <Button onClick={() => setIsRecordModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />Add record
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-5">
                {medicalRecords.map((record) => {
                  const urg = record.urgency ?? "Routine";
                  const urgStyle = urgencyConfig[urg]?.color ?? urgencyConfig.Routine.color;
                  return (
                    <div key={record.id} className="relative pl-12">
                      <div className="absolute left-3 top-5 w-4 h-4 rounded-full bg-primary border-2 border-background shadow" />
                      <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-sm transition-shadow">
                        {/* Record header */}
                        <div className="px-5 py-4 border-b border-border">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-base">{record.diagnosis}</span>
                                {record.icdCode && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                    {record.icdCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{formatDate(record.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />{record.doctor}
                                </span>
                                {record.visitType && (
                                  <span className="px-2 py-0.5 rounded bg-muted">{record.visitType}</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${urgStyle}`}>
                              {urg}
                            </span>
                          </div>
                          {record.chiefComplaint && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              <span className="font-medium text-foreground">Chief complaint:</span>{" "}
                              {record.chiefComplaint}
                            </p>
                          )}
                        </div>

                        <div className="px-5 py-4 space-y-4">
                          {/* Vital Signs */}
                          {record.vitalSigns && Object.values(record.vitalSigns).some(Boolean) && (
                            <VitalSignsGrid vs={record.vitalSigns} />
                          )}

                          {/* Secondary Diagnoses */}
                          {record.secondaryDiagnoses && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Secondary diagnoses</p>
                              <p className="text-sm">{record.secondaryDiagnoses}</p>
                            </div>
                          )}

                          {/* Symptoms */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Symptoms</p>
                            <p className="text-sm">{record.symptoms}</p>
                          </div>

                          {/* Physical Exam */}
                          {record.physicalExam && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Physical examination</p>
                              <p className="text-sm">{record.physicalExam}</p>
                            </div>
                          )}

                          {/* Treatment narrative */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Treatment plan</p>
                            <p className="text-sm leading-relaxed">{record.treatment}</p>
                          </div>

                          {/* Prescribed Drugs */}
                          {(record.prescribedDrugs?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5" />
                                Prescribed medications ({record.prescribedDrugs?.length ?? 0})
                              </p>
                              <div className="space-y-2">
                                {(record.prescribedDrugs ?? []).map((drug) => (
                                  <DrugCard key={drug.id} drug={drug} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Procedures */}
                          {record.procedures && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />Procedures
                              </p>
                              <p className="text-sm">{record.procedures}</p>
                            </div>
                          )}

                          {/* Follow-up + Referral */}
                          {(record.followUpIn || record.referral) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {record.followUpIn && (
                                <div className="rounded-lg bg-muted/50 border border-border p-3">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Follow-up</p>
                                  <p className="text-sm font-medium">{record.followUpIn}</p>
                                  {record.followUpType && (
                                    <p className="text-xs text-muted-foreground">{record.followUpType}</p>
                                  )}
                                </div>
                              )}
                              {record.referral && (
                                <div className="rounded-lg bg-muted/50 border border-border p-3">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" />Referral
                                  </p>
                                  <p className="text-sm">{record.referral}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Patient Education */}
                          {record.patientEducation && (
                            <div className="rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />Patient education provided
                              </p>
                              <p className="text-sm text-blue-800 dark:text-blue-300">{record.patientEducation}</p>
                            </div>
                          )}

                          {/* Attachments */}
                          {record.attachments?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                Attachments ({record.attachments.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {record.attachments.map((att) => (
                                  <button
                                    key={att.id}
                                    onClick={() => downloadAttachment(att)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg border border-border transition-colors"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-24">{att.name}</span>
                                    <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
                                    <Download className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Lab Results ── */}
        <TabsContent value="lab-results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lab Results</h3>
            {canAddLabResults && (
              <Button size="sm" onClick={() => setIsLabModalOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />Upload Result
              </Button>
            )}
          </div>
          {labResults.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No lab results</EmptyTitle>
                <EmptyDescription>No laboratory results have been recorded.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {labResults.map((result) => (
                <div key={result.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{result.testName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(result.date)}</p>
                    </div>
                    <Badge variant={statusBadge[result.status]} className="text-xs">{result.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Result</p>
                      <p className="font-medium">
                        {result.result} {result.unit && <span className="text-muted-foreground">{result.unit}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Reference range</p>
                      <p className="font-medium">{result.referenceRange}</p>
                    </div>
                    {result.notes && (
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                        <p className="text-sm">{result.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Appointments ── */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Appointment History
            </h3>
            {canScheduleAppointments && (
              <Button size="sm" onClick={() => onNavigate(`create-appointment-patient-${patientId}`)} className="gap-1.5">
                <Plus className="w-4 h-4" />Schedule
              </Button>
            )}
          </div>

          {patientAppointments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No appointments yet</EmptyTitle>
                <EmptyDescription>Schedule the first appointment for this patient.</EmptyDescription>
              </EmptyHeader>
              {canScheduleAppointments && (
                <EmptyContent>
                  <Button onClick={() => onNavigate(`create-appointment-patient-${patientId}`)} className="gap-2">
                    <CalendarDays className="w-4 h-4" />Schedule Appointment
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="space-y-3">
              {patientAppointments.map((apt) => {
                const now = new Date();
                const aptDate = new Date(apt.date);
                const isPast = aptDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());

                const statusStyles: Record<string, string> = {
                  Scheduled: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
                  Completed: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
                  Cancelled: "text-muted-foreground bg-muted border-border",
                };
                const statusIcons: Record<string, React.ReactNode> = {
                  Scheduled: <AlertCircle className="w-3 h-3" />,
                  Completed: <CheckCircle2 className="w-3 h-3" />,
                  Cancelled: <XCircle className="w-3 h-3" />,
                };

                return (
                  <div key={apt.id} className="bg-card rounded-xl border border-border p-4 group">
                    <div className="flex items-start gap-4">
                      {/* Date block */}
                      <div
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
                          isPast ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="text-xs font-bold leading-none">
                          {formatDate(apt.date, "dd")}
                        </span>
                        <span className="text-[10px] leading-none uppercase opacity-80 mt-0.5">
                          {formatDate(apt.date, "MMM")}
                        </span>
                        <span className="text-[10px] leading-none opacity-60 mt-0.5">
                          {formatDate(apt.date, "yyyy")}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-sm">{apt.type}</p>
                          <span
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[apt.status]}`}
                          >
                            {statusIcons[apt.status]}
                            {apt.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {apt.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {apt.doctor}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
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
                          {apt.status !== "Completed" && (
                            <DropdownMenuItem
                              onClick={() => updateAppointmentStatus(apt.id, "Completed")}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                              Mark as completed
                            </DropdownMenuItem>
                          )}
                          {apt.status !== "Cancelled" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => updateAppointmentStatus(apt.id, "Cancelled")}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel appointment
                            </DropdownMenuItem>
                          )}
                          {apt.status === "Cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => updateAppointmentStatus(apt.id, "Scheduled")}
                              >
                                <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                                Reschedule
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Clinical Notes</h3>
            {canAddNotes && (
              <Button size="sm" onClick={() => setIsNoteModalOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />Add note
              </Button>
            )}
          </div>
          {notes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No clinical notes</EmptyTitle>
                <EmptyDescription>Add the first clinical note for this patient.</EmptyDescription>
              </EmptyHeader>
              {canAddNotes && (
                <EmptyContent>
                  <Button onClick={() => setIsNoteModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />Add note
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(note.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{note.author}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(note.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════
          ADD MEDICAL RECORD MODAL
      ════════════════════════════════════════════ */}
      <Dialog open={isRecordModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-8 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              New Medical Record
            </DialogTitle>
          </DialogHeader>

          <form id="record-form" onSubmit={handleSubmit(onAddRecord)} className="flex-1 overflow-y-auto">
            <div className="px-8 py-6">
            {/* ═══ TWO-COLUMN LAYOUT ═══ */}
            <div className="grid grid-cols-2 gap-x-8">

              {/* ── LEFT COLUMN ── */}
              <div className="space-y-5">

                {/* Section 1: Visit info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Visit Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Date" required error={errors.date?.message}>
                      <Input type="date" {...register("date")} />
                    </FormField>
                    <FormField label="Urgency" required error={errors.urgency?.message}>
                      <Select defaultValue="Routine" onValueChange={(v) => setValue("urgency", v as UrgencyLevel)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {URGENCY_LEVELS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Visit type" required error={errors.visitType?.message}>
                      <Select defaultValue="In-person" onValueChange={(v) => setValue("visitType", v as MedicalRecordFormData["visitType"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VISIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Doctor" required error={errors.doctor?.message}>
                      <Input {...register("doctor")} defaultValue={user?.name} placeholder="Dr. Name" />
                    </FormField>
                  </div>
                </div>

                {/* Section 2: Diagnosis */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />Diagnosis
                  </h3>
                  <FormField label="Chief complaint" required error={errors.chiefComplaint?.message}>
                    <Input {...register("chiefComplaint")} placeholder="Primary reason for visit" />
                  </FormField>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormField label="Primary diagnosis" required error={errors.diagnosis?.message}>
                        <Input {...register("diagnosis")} placeholder="e.g. Nephrolithiasis (Kidney Stones)" />
                      </FormField>
                    </div>
                    <FormField label="ICD-10 code" error={errors.icdCode?.message}>
                      <Input {...register("icdCode")} placeholder="e.g. N20.1" className="font-mono" />
                    </FormField>
                  </div>
                  <FormField label="Secondary diagnoses" error={errors.secondaryDiagnoses?.message}>
                    <Input {...register("secondaryDiagnoses")} placeholder="e.g. Dehydration, Hypercalciuria (comma-separated)" />
                  </FormField>
                </div>

                {/* Section 3: Clinical findings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />Clinical Findings
                  </h3>
                  <FormField label="Symptoms" required error={errors.symptoms?.message}>
                    <Textarea {...register("symptoms")} placeholder="Describe patient symptoms in detail..." rows={3} />
                  </FormField>
                  <FormField label="Physical examination findings" error={errors.physicalExam?.message}>
                    <Textarea {...register("physicalExam")} placeholder="e.g. CVA tenderness right side ++. Abdomen soft..." rows={2} />
                  </FormField>
                </div>

                {/* Section 4: Vital signs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: "bp" as const,     label: "Blood pressure",  placeholder: "120/80 mmHg",  icon: <Activity className="w-3 h-3" /> },
                      { field: "hr" as const,     label: "Heart rate",      placeholder: "72 bpm",       icon: <Heart className="w-3 h-3" /> },
                      { field: "temp" as const,   label: "Temperature",     placeholder: "37.0 °C",      icon: <Thermometer className="w-3 h-3" /> },
                      { field: "rr" as const,     label: "Respiratory rate",placeholder: "16 /min",      icon: <Wind className="w-3 h-3" /> },
                      { field: "spo2" as const,   label: "SpO₂",            placeholder: "98 %",         icon: <Eye className="w-3 h-3" /> },
                      { field: "weight" as const, label: "Weight",          placeholder: "70 kg",        icon: <Weight className="w-3 h-3" /> },
                      { field: "height" as const, label: "Height",          placeholder: "175 cm",       icon: <User className="w-3 h-3" /> },
                    ].map(({ field, label, placeholder, icon }) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs flex items-center gap-1 text-muted-foreground">{icon}{label}</Label>
                        <Input {...register(field)} placeholder={placeholder} className="text-sm h-8" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5: Treatment plan */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />Treatment Plan
                  </h3>
                  <FormField label="Treatment plan narrative" required error={errors.treatment?.message}>
                    <Textarea {...register("treatment")} placeholder="Describe the overall treatment approach, interventions, and clinical decisions made..." rows={3} />
                  </FormField>
                  <FormField label="Procedures performed" error={errors.procedures?.message}>
                    <Input {...register("procedures")} placeholder="e.g. CT abdomen/pelvis, IV access, Urinalysis" />
                  </FormField>
                </div>

                {/* Section 6: Follow-up & Referral */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Follow-up & Referral
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Follow-up in" error={errors.followUpIn?.message}>
                      <Input {...register("followUpIn")} placeholder="e.g. 1 week, 3 months" />
                    </FormField>
                    <FormField label="Follow-up type" error={errors.followUpType?.message}>
                      <Select onValueChange={(v) => setValue("followUpType", v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {FOLLOW_UP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="Referral" error={errors.referral?.message}>
                    <Input {...register("referral")} placeholder="e.g. Urology — Dr. Patterson — within 1 week" />
                  </FormField>
                </div>

                {/* Section 7: Patient education */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />Patient Education
                  </h3>
                  <FormField label="Instructions given to patient" error={errors.patientEducation?.message}>
                    <Textarea
                      {...register("patientEducation")}
                      placeholder="Lifestyle advice, warning signs to watch for, medication instructions..."
                      rows={3}
                    />
                  </FormField>
                </div>

              </div>{/* end LEFT */}

              {/* ── RIGHT COLUMN ── */}
              <div className="space-y-5">

                {/* Section 8: Prescribed drugs — full right column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5" />Prescribed Medications ({fields.length})
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addEmptyDrug} className="gap-1.5 h-7 text-xs">
                      <Plus className="w-3.5 h-3.5" />Add drug
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <button
                      type="button"
                      onClick={addEmptyDrug}
                      className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Pill className="w-8 h-8" />
                      <span className="text-sm font-medium">No medications prescribed yet</span>
                      <span className="text-xs">Click to add a drug prescription</span>
                    </button>
                  ) : (
                    <div className="space-y-3 max-h-[calc(96vh-260px)] overflow-y-auto pr-1">
                      {fields.map((field, index) => (
                        <DrugFormRow
                          key={field.id}
                          index={index}
                          register={register}
                          errors={errors}
                          remove={remove}
                          setValue={setValue}
                          getValues={getValues}
                        />
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addEmptyDrug} className="w-full gap-1.5">
                        <Plus className="w-4 h-4" />Add another drug
                      </Button>
                    </div>
                  )}
                </div>

                {/* Section 9: Attachments */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />Attachments
                  </h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-sm font-medium text-muted-foreground">Click to upload files</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF, PNG, JPG up to 10MB each</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif" className="hidden"
                    onChange={handleFileUpload}
                  />
                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                          <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{att.name}</span>
                          <span className="text-xs text-muted-foreground">{formatFileSize(att.size)}</span>
                          <button type="button" onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>{/* end RIGHT */}
            </div>{/* end grid */}

            </div>{/* end px-8 py-6 wrapper */}

          </form>

          {/* ── Sticky Footer ── */}
          <div className="shrink-0 border-t border-border bg-background px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>This record is protected under HIPAA. Ensure all information entered is accurate and clinically relevant.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" form="record-form" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? "Saving..." : "Save record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Note Modal ── */}
      <Dialog open={isNoteModalOpen} onOpenChange={(open) => { if (!open) { setIsNoteModalOpen(false); resetNote(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Clinical Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNoteSubmit(onAddNote)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Note <span className="text-destructive">*</span></Label>
              <Textarea
                {...registerNote("content")}
                placeholder="Enter clinical observations, follow-up notes, or relevant information..."
                rows={5}
              />
              {noteErrors.content && <p className="text-xs text-destructive">{noteErrors.content.message}</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              Signed as: <strong>{user?.name}</strong> · {new Date().toLocaleDateString()}
            </p>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setIsNoteModalOpen(false); resetNote(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isNoteSubmitting}>
                {isNoteSubmitting ? "Saving..." : "Save note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Upload Lab Result Modal ── */}
      <Dialog open={isLabModalOpen} onOpenChange={(open) => { if (!open) { setIsLabModalOpen(false); resetLab({ date: new Date().toISOString().split("T")[0], status: "Normal", unit: "", notes: "" }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              Upload Lab Result
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLabSubmit(onAddLabResult)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="lab-date">Date <span className="text-destructive">*</span></Label>
                <Input id="lab-date" type="date" {...registerLab("date")} />
                {labErrors.date && <p className="text-xs text-destructive">{labErrors.date.message}</p>}
              </div>

              {/* Test Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lab-testName">Test name <span className="text-destructive">*</span></Label>
                <Input id="lab-testName" placeholder="e.g. Creatinine, CBC" {...registerLab("testName")} />
                {labErrors.testName && <p className="text-xs text-destructive">{labErrors.testName.message}</p>}
              </div>

              {/* Result */}
              <div className="space-y-1.5">
                <Label htmlFor="lab-result">Result <span className="text-destructive">*</span></Label>
                <Input id="lab-result" placeholder="e.g. 1.2, 95%" {...registerLab("result")} />
                {labErrors.result && <p className="text-xs text-destructive">{labErrors.result.message}</p>}
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <Label htmlFor="lab-unit">Unit</Label>
                <Input id="lab-unit" placeholder="e.g. mg/dL, mmol/L" {...registerLab("unit")} />
              </div>

              {/* Reference Range */}
              <div className="space-y-1.5">
                <Label htmlFor="lab-refRange">Reference range <span className="text-destructive">*</span></Label>
                <Input id="lab-refRange" placeholder="e.g. 0.6–1.2 mg/dL" {...registerLab("referenceRange")} />
                {labErrors.referenceRange && <p className="text-xs text-destructive">{labErrors.referenceRange.message}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Select
                  value={watchLab("status")}
                  onValueChange={(v) => setLabValue("status", v as "Normal" | "Abnormal" | "Critical")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Abnormal">Abnormal</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="lab-notes">Notes</Label>
                <Textarea
                  id="lab-notes"
                  placeholder="Additional observations or comments..."
                  rows={2}
                  {...registerLab("notes")}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Uploaded by: <strong>{user?.name}</strong> · {new Date().toLocaleDateString()}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setIsLabModalOpen(false); resetLab({ date: new Date().toISOString().split("T")[0], status: "Normal", unit: "", notes: "" }); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLabSubmitting}>
                {isLabSubmitting ? "Uploading..." : "Upload result"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
