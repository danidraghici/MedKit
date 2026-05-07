import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Phone, Mail, Droplets, Calendar, User, Pill, AlertTriangle, CreditCard,
  Plus, FileText, FlaskConical, StickyNote, ClipboardList, Clock, Stethoscope,
  Upload, X, Download, Paperclip, Trash2, Activity, Heart, Thermometer,
  Wind, Eye, Weight, ChevronDown, ChevronUp, BookOpen, UserCheck, AlertCircle,
  CalendarDays, CheckCircle2, XCircle, MoreVertical, Pencil, Loader2, Sparkles,
  ShieldCheck, TrendingUp,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IcdSearchField } from "@/components/IcdSearchField";
import { IcdMultiSearchField } from "@/components/IcdMultiSearchField";
import { ICD10_RO } from "@/lib/icd10-ro";
import { VoiceRecorderButton } from "@/components/VoiceRecorderButton";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, calculateAge, getInitials, formatFileSize } from "@/lib/utils";
import type { Attachment, MedicalRecord, PrescribedDrug, RouteOfAdministration, DrugFrequency, UrgencyLevel, FollowUpType, Appointment, SampleType, LabAIInsight, VoiceToMedicalRecordResponse } from "@/lib/types";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const drugSchema = z.object({
  name: z.string().min(1, "Denumirea medicamentului este obligatorie"),
  genericName: z.string().optional(),
  dose: z.string().min(1, "Doza este obligatorie"),
  route: z.string().min(1, "Calea de administrare este obligatorie"),
  frequency: z.string().min(1, "Frecvența este obligatorie"),
  duration: z.string().min(1, "Durata este obligatorie"),
  quantity: z.string().optional(),
  refills: z.string().optional(),
  instructions: z.string().optional(),
  indication: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const medicalRecordSchema = z.object({
  date: z.string().min(1, "Data este obligatorie"),
  doctor: z.string().min(2, "Numele medicului este obligatoriu"),
  visitType: z.enum(["În persoană", "Telemedicină", "Urgență", "Consult", "Procedură"]),
  chiefComplaint: z.string().min(2, "Acuza principală este obligatorie"),
  diagnosis: z.string().min(2, "Diagnosticul este obligatoriu"),
  icdCode: z.string().optional(),
  secondaryDiagnoses: z.string().optional(),
  symptoms: z.string().min(2, "Simptomele sunt obligatorii"),
  physicalExam: z.string().optional(),
  bp: z.string().optional(),
  hr: z.string().optional(),
  temp: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  treatment: z.string().min(2, "Planul de tratament este obligatoriu"),
  prescribedDrugs: z.array(drugSchema),
  procedures: z.string().optional(),
  urgency: z.enum(["Rutină", "Semi-urgent", "Urgent", "Urgență"]),
  followUpIn: z.string().optional(),
  followUpType: z.string().optional(),
  referral: z.string().optional(),
  patientEducation: z.string().optional(),
});

const noteSchema = z.object({
  content: z.string().min(5, "Nota trebuie să aibă cel puțin 5 caractere"),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;
type NoteFormData = z.infer<typeof noteSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTES: RouteOfAdministration[] = ["Oral","IV","IM","Subcutanat","Topic","Inhalator","Sublingual","Rectal","Nazal","Oftalmic","Transdermal","Altul"];
const FREQUENCIES: DrugFrequency[] = ["O dată pe zi","De două ori pe zi","De trei ori pe zi","De patru ori pe zi","La 4 ore","La 6 ore","La 8 ore","La 12 ore","La 24 ore","PRN (la nevoie)","Săptămânal","La două săptămâni","Lunar","O singură doză","Altul"];
const URGENCY_LEVELS: UrgencyLevel[] = ["Rutină","Semi-urgent","Urgent","Urgență"];
const FOLLOW_UP_TYPES: FollowUpType[] = ["Consultație la cabinet","Apel telefonic","Analize de laborator","Imagistică","Trimitere la specialist","Urgențe dacă simptomele se agravează","Niciunul"];
const VISIT_TYPES = ["În persoană","Telemedicină","Urgență","Consult","Procedură"] as const;

type PatientAppointmentStatus = "Planificată" | "Finalizată" | "Anulată";

const normalizeAppointmentStatus = (status: string): PatientAppointmentStatus => {
  switch (status) {
    case "Scheduled":
    case "Programat":
    case "Programată":
    case "Planificată":
      return "Planificată";
    case "Completed":
    case "Finalizat":
    case "Finalizată":
      return "Finalizată";
    case "Cancelled":
    case "Anulat":
    case "Anulată":
      return "Anulată";
    default:
      return "Planificată";
  }
};

const toApiAppointmentStatus = (status: PatientAppointmentStatus): "Scheduled" | "Completed" | "Cancelled" => {
  switch (status) {
    case "Planificată":
      return "Scheduled";
    case "Finalizată":
      return "Completed";
    case "Anulată":
      return "Cancelled";
  }
};

const urgencyConfig: Record<UrgencyLevel, { color: string; badge: "default" | "secondary" | "outline" }> = {
  Rutină:     { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800", badge: "secondary" },
  "Semi-urgent": { color: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800", badge: "secondary" },
  Urgent:      { color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", badge: "secondary" },
  Urgență:   { color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800", badge: "secondary" },
};

const routeBadgeColor: Record<string, string> = {
  Oral: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  IV:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  IM:   "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  Subcutanat: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  Topic: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  Inhalator: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  Sublingual: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  Rectal: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
  Nazal: "bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400",
  Oftalmic: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  Transdermal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  Altul: "bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400",
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
            <p className="text-xs text-muted-foreground mt-0.5 italic">Pentru: {drug.indication}</p>
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
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Reaprovizionări</p>
                <p>{drug.refills}</p>
              </div>
            )}
            {drug.startDate && (
              <div>
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Data de început</p>
                <p>{formatDate(drug.startDate)}</p>
              </div>
            )}
            {drug.endDate && (
              <div>
                <p className="text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Data de sfârșit</p>
                <p>{formatDate(drug.endDate)}</p>
              </div>
            )}
          </div>
          {drug.instructions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Instrucțiuni speciale
              </p>
              <p className="text-sm bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg px-3 py-2 text-yellow-900 dark:text-yellow-300">
                ⚠️ {drug.instructions}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Prescris de: <strong>{drug.prescribedBy}</strong></p>
        </div>
      )}
    </div>
  );
}

// ─── VitalSignsGrid ───────────────────────────────────────────────────────────

function VitalSignsGrid({ vs }: { vs: NonNullable<MedicalRecord["vitalSigns"]> }) {
  const items = [
    { icon: <Activity className="w-3.5 h-3.5" />, label: "Presiune arterială", value: vs.bloodPressure, unit: "mmHg" },
    { icon: <Heart className="w-3.5 h-3.5" />, label: "Frecvență cardiacă", value: vs.heartRate, unit: "" },
    { icon: <Thermometer className="w-3.5 h-3.5" />, label: "Temperatură", value: vs.temperature, unit: "" },
    { icon: <Wind className="w-3.5 h-3.5" />, label: "Frecvență respiratorie", value: vs.respiratoryRate, unit: "" },
    { icon: <Eye className="w-3.5 h-3.5" />, label: "Saturație de oxigen", value: vs.oxygenSaturation, unit: "" },
    { icon: <Weight className="w-3.5 h-3.5" />, label: "Greutate", value: vs.weight, unit: "" },
    { icon: <User className="w-3.5 h-3.5" />, label: "Înălțime", value: vs.height, unit: "" },
  ].filter((i) => i.value);

  if (!items.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Semne vitale</p>
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
        <span className="text-sm font-medium flex-1">Medicament #{index + 1}</span>
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
            <FormField label="Nume medicament" required error={drugErrors?.name?.message}>
              <Input {...register(`prescribedDrugs.${index}.name`)} placeholder="e.g. Tamsulosin" />
            </FormField>
            <FormField label="Nume generic" error={drugErrors?.genericName?.message}>
              <Input {...register(`prescribedDrugs.${index}.genericName`)} placeholder="e.g. Tamsulosin HCl" />
            </FormField>
          </div>

          {/* Row 2: Dose + Route + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Doză" required error={drugErrors?.dose?.message}>
              <Input {...register(`prescribedDrugs.${index}.dose`)} placeholder="e.g. 0.4mg" />
            </FormField>
            <FormField label="Cale de administrare" required error={drugErrors?.route?.message}>
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
            <FormField label="Frecvență" required error={drugErrors?.frequency?.message}>
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
            <FormField label="Durată" required error={drugErrors?.duration?.message}>
              <Input {...register(`prescribedDrugs.${index}.duration`)} placeholder="de ex. 7 zile, În curs" />
            </FormField>
            <FormField label="Cantitate" error={drugErrors?.quantity?.message}>
              <Input {...register(`prescribedDrugs.${index}.quantity`)} placeholder="de ex. 30 comprimate" />
            </FormField>
            <FormField label="Reaprovizionare" error={drugErrors?.refills?.message}>
              <Input {...register(`prescribedDrugs.${index}.refills`)} placeholder="de ex. Fără reaprovizionare" />
            </FormField>
          </div>

          {/* Row 4: Start + End date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Data de început" error={drugErrors?.startDate?.message}>
              <Input type="date" {...register(`prescribedDrugs.${index}.startDate`)} />
            </FormField>
            <FormField label="Data de sfârșit" error={drugErrors?.endDate?.message}>
              <Input type="date" {...register(`prescribedDrugs.${index}.endDate`)} />
            </FormField>
          </div>

          {/* Row 5: Indication */}
          <FormField label="Indicație (motivul prescrierii)" error={drugErrors?.indication?.message}>
            <Input {...register(`prescribedDrugs.${index}.indication`)} placeholder="de ex. Tratament pentru colică renală" />
          </FormField>

          {/* Row 6: Special instructions */}
          <FormField label="Instrucțiuni speciale" error={drugErrors?.instructions?.message}>
            <Textarea
              {...register(`prescribedDrugs.${index}.instructions`)}
              placeholder="de ex. A se administra cu alimente, A nu se întrerupe brusc, Monitorizați tensiunea arterială"
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
  const fetchNotes = useAppStore((s) => s.fetchNotes);
  const addMedicalRecord = useAppStore((s) => s.addMedicalRecord);
  const updateMedicalRecord = useAppStore((s) => s.updateMedicalRecord);
  const fetchMedicalRecords = useAppStore((s) => s.fetchMedicalRecords);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const fetchLabResults = useAppStore((s) => s.fetchLabResults);
  const uploadLabResult = useAppStore((s) => s.uploadLabResult);
  const getLabResultDownloadUrl = useAppStore((s) => s.getLabResultDownloadUrl);
  const allLabRequests = useAppStore((s) => s.labRequests);
  const labRequests = useMemo(
    () => allLabRequests.filter((r) => r.patientId === patientId),
    [allLabRequests, patientId]
  );
  const fetchLabRequestsByPatient = useAppStore((s) => s.fetchLabRequestsByPatient);
  const updateLabRequestStatus = useAppStore((s) => s.updateLabRequestStatus);
  const submitLabResult = useAppStore((s) => s.submitLabResult);
  const fetchLabAIInsight = useAppStore((s) => s.fetchLabAIInsight);
  const getLabAIInsight = useAppStore((s) => s.getLabAIInsight);
  const labAIInsightLoading = useAppStore((s) => s.labAIInsightLoading);
  const user = useAppStore((s) => s.user);

  // Role-based permissions
  const isLabDoctor = user?.role === "lab_doctor";
  const isSpecialist = user?.role === "specialist_doctor";
  const isAdmin = user?.role === "admin";
  // Lab doctors upload results only through lab requests, not directly to patients
  const canAddLabResults = false;
  const canAddRecords = isSpecialist || isAdmin;
  const canAddNotes = isSpecialist || isAdmin;
  const canScheduleAppointments = isSpecialist || isAdmin;

  // Lab result upload state
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [labFile, setLabFile] = useState<File | null>(null);
  const [labFileError, setLabFileError] = useState<string | null>(null);
  const [isLabUploading, setIsLabUploading] = useState(false);
  const [isLabResultsLoading, setIsLabResultsLoading] = useState(true);

  // AI Insight modal state
  const [insightModal, setInsightModal] = useState<LabAIInsight | null>(null);

  const handleOpenInsight = async (labResultId: string) => {
    const cached = getLabAIInsight(labResultId);
    if (cached) { setInsightModal(cached); return; }
    const insight = await fetchLabAIInsight(labResultId);
    if (insight) setInsightModal(insight);
  };

  // Inline lab request action state (lab doctor)
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [submittingReqId, setSubmittingReqId] = useState<string | null>(null);
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [labReqObs, setLabReqObs] = useState("");
  const [labReqFile, setLabReqFile] = useState<File | null>(null);
  const [isMedicalRecordsLoading, setIsMedicalRecordsLoading] = useState(true);

  const patient = getPatient(patientId);
  const medicalRecords = getMedicalRecords(patientId);
  const labResults = getLabResults(patientId);
  const notes = getNotes(patientId);

  const [patientAppts, setPatientAppts] = useState<Appointment[]>([]);
  const [patientApptLoading, setPatientApptLoading] = useState(true);

  useEffect(() => {
    if (isLabDoctor) { setPatientApptLoading(false); return; }
    setPatientApptLoading(true);
    void api.get<Appointment[]>(`/api/appointments/patient/${patientId}`)
      .then((apts) => {
        setPatientAppts(
          apts.map((apt) => ({
            ...apt,
            status: normalizeAppointmentStatus(apt.status) as Appointment["status"],
          }))
        );
      })
      .catch(console.error)
      .finally(() => setPatientApptLoading(false));
  }, [patientId, isLabDoctor, user?.role, user?.doctorId]);

  useEffect(() => {
    if (isLabDoctor) { setIsMedicalRecordsLoading(false); return; }
    setIsMedicalRecordsLoading(true);
    fetchMedicalRecords(patientId)
      .catch((err: Error) => toast.error(err.message ?? "Failed to load medical records."))
      .finally(() => setIsMedicalRecordsLoading(false));
  }, [patientId, isLabDoctor, fetchMedicalRecords]);

  useEffect(() => {
    if (isLabDoctor) { setIsNotesLoading(false); return; }
    setIsNotesLoading(true);
    void fetchNotes(patientId).finally(() => setIsNotesLoading(false));
  }, [patientId, isLabDoctor, fetchNotes]);

  useEffect(() => {
    setIsLabResultsLoading(true);
    void fetchLabResults(patientId).finally(() => setIsLabResultsLoading(false));
  }, [patientId, fetchLabResults]);

  useEffect(() => {
    void fetchLabRequestsByPatient(patientId);
  }, [patientId, fetchLabRequestsByPatient]);

  const handleStartLabProcessing = async (reqId: string) => {
    setProcessingReqId(reqId);
    try {
      await updateLabRequestStatus(reqId, "În procesare");
      toast.success("Status actualizat la În procesare.");
      setExpandedReqId(reqId);
      setLabReqObs("");
      setLabReqFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Eroare la actualizarea statusului.");
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleSubmitLabResult = async (reqId: string) => {
    if (!labReqObs.trim() && !labReqFile) {
      toast.error("Provide observations, a file, or both.");
      return;
    }
    setSubmittingReqId(reqId);
    try {
      await submitLabResult(reqId, labReqObs.trim() || undefined, labReqFile ?? undefined);
      toast.success("Rezultate trimise cu succes. Status actualizat la Complet.");
      setExpandedReqId(null);
      setLabReqObs("");
      setLabReqFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Eroare la trimiterea rezultatelor.");
    } finally {
      setSubmittingReqId(null);
    }
  };

  const handleApptStatusChange = async (id: string, status: PatientAppointmentStatus) => {
    try {
      await api.patch(`/api/appointments/${id}/status`, { status: toApiAppointmentStatus(status) });
      setPatientAppts((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: status as Appointment["status"] } : a)
      );
    } catch (err) {
      console.error("Eroare la actualizarea statusului programării:", err);
    }
  };

  const patientAppointments = patientAppts;

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isNotesLoading, setIsNotesLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labReqFileRef = useRef<HTMLInputElement>(null);

  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [selectedSamples, setSelectedSamples] = useState<SampleType[]>([]);
  const [labRequestNotes, setLabRequestNotes] = useState("");

  const {
    register, handleSubmit, reset, setValue, watch, getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      visitType: "În persoană",
      urgency: "Rutină",
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
    register: registerEditNote,
    handleSubmit: handleEditNoteSubmit,
    reset: resetEditNote,
    formState: { errors: editNoteErrors, isSubmitting: isEditNoteSubmitting },
  } = useForm<NoteFormData>({ resolver: zodResolver(noteSchema) });


  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Pacientul nu a fost găsit.</p>
        <Button variant="ghost" className="mt-4" onClick={() => onNavigate("patients")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Înapoi la lista de pacienți
        </Button>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      size: file.size,
      file,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset input so the same file can be re-selected if removed
    e.target.value = "";
  };

  const openAddModal = () => {
    setEditingRecord(null);
    reset({ date: new Date().toISOString().split("T")[0], visitType: "În persoană", urgency: "Rutină", prescribedDrugs: [] });
    setAttachments([]);
    setSelectedSamples([]);
    setLabRequestNotes("");
    setIsRecordModalOpen(true);
  };

  const closeModal = () => {
    setIsRecordModalOpen(false);
    setEditingRecord(null);
    reset({ date: new Date().toISOString().split("T")[0], visitType: "În persoană", urgency: "Rutină", prescribedDrugs: [] });
    setAttachments([]);
    setSelectedSamples([]);
    setLabRequestNotes("");
  };

  const buildRecordPayload = (data: MedicalRecordFormData) => ({
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
  });

  const onSaveRecord = async (data: MedicalRecordFormData) => {
    try {
      const samplePayload = selectedSamples.length > 0 ? selectedSamples : undefined;
      let savedRecord: import("@/lib/types").MedicalRecord;
      if (editingRecord) {
        savedRecord = await updateMedicalRecord(editingRecord.id, {
          ...buildRecordPayload(data),
          sampleTypes: samplePayload,
          labRequestNotes: labRequestNotes.trim() || undefined,
        });
      } else {
        savedRecord = await addMedicalRecord({
          patientId,
          date: data.date,
          doctor: data.doctor,
          doctorId: user?.doctorId ?? "",
          ...buildRecordPayload(data),
          sampleTypes: samplePayload,
          labRequestNotes: labRequestNotes.trim() || undefined,
        });
      }

      const pendingFiles = attachments.filter((a) => a.file);
      if (pendingFiles.length > 0) {
        await Promise.all(
          pendingFiles.map((a) => {
            const form = new FormData();
            form.append("file", a.file!);
            return api.postFile(`/api/medical-records/${savedRecord.id}/attachments`, form);
          })
        );
        await fetchMedicalRecords(patientId);
      }

      closeModal();
      void fetchLabRequestsByPatient(patientId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Eroare la salvarea înregistrării medicale.";
      toast.error(msg);
    }
  };

  const openEditRecord = (record: MedicalRecord) => {
    reset({
      date: record.date,
      doctor: record.doctor,
      visitType: record.visitType,
      urgency: record.urgency,
      chiefComplaint: record.chiefComplaint,
      diagnosis: record.diagnosis,
      icdCode: record.icdCode ?? "",
      secondaryDiagnoses: record.secondaryDiagnoses ?? "",
      symptoms: record.symptoms,
      physicalExam: record.physicalExam ?? "",
      bp: record.vitalSigns?.bloodPressure ?? "",
      hr: record.vitalSigns?.heartRate ?? "",
      temp: record.vitalSigns?.temperature ?? "",
      rr: record.vitalSigns?.respiratoryRate ?? "",
      spo2: record.vitalSigns?.oxygenSaturation ?? "",
      weight: record.vitalSigns?.weight ?? "",
      height: record.vitalSigns?.height ?? "",
      treatment: record.treatment,
      procedures: record.procedures ?? "",
      followUpIn: record.followUpIn ?? "",
      followUpType: record.followUpType ?? "",
      referral: record.referral ?? "",
      patientEducation: record.patientEducation ?? "",
      prescribedDrugs: (record.prescribedDrugs ?? []).map((d) => ({
        name: d.name,
        genericName: d.genericName ?? "",
        dose: d.dose,
        route: d.route,
        frequency: d.frequency,
        duration: d.duration,
        quantity: d.quantity ?? "",
        refills: d.refills ?? "",
        instructions: d.instructions ?? "",
        indication: d.indication ?? "",
        startDate: d.startDate ?? "",
        endDate: d.endDate ?? "",
      })),
    });
    if (record.labRequest?.status === "În așteptare") {
      setSelectedSamples(record.labRequest.sampleTypes ?? []);
      setLabRequestNotes(record.labRequest.notes ?? "");
    } else {
      setSelectedSamples([]);
      setLabRequestNotes("");
    }
    setAttachments(
      (record.attachments ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: `/api/attachments/${a.id}/file`,
        size: a.size,
      }))
    );
    setEditingRecord(record);
    setIsRecordModalOpen(true);
  };

  const openAddNoteModal = () => {
    if (isAdmin && !user?.doctorId) {
      toast.error("Conturile de admin fără un profil de medic asociat nu pot crea note.");
      return;
    }
    setIsNoteModalOpen(true);
  };

  const onAddNote = async (data: NoteFormData) => {
    try {
      await addNote(patientId, data.content);
      setIsNoteModalOpen(false);
      resetNote();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Eroare la adăugarea notei.";
      toast.error(msg);
    }
  };

  const onEditNote = async (data: NoteFormData) => {
    if (!editingNoteId) return;
    await updateNote(editingNoteId, data.content);
    setIsEditNoteModalOpen(false);
    setEditingNoteId(null);
    resetEditNote();
  };

  const onDeleteNote = async (id: string) => {
    if (!window.confirm("Șterge această notă? Această acțiune nu poate fi anulată.")) return;
    await deleteNote(id);
  };

  const canManageNote = (authorId: string) =>
    isAdmin || authorId === user?.doctorId;

  const canEditRecord = (record: MedicalRecord) =>
    (isSpecialist && user?.doctorId === record.doctorId) || isAdmin;

  const ALLOWED_LAB_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_LAB_SIZE = 10 * 1024 * 1024;

  const handleLabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLabFile(file);
    setLabFileError(null);
    if (file && !ALLOWED_LAB_TYPES.includes(file.type))
      setLabFileError("Doar fișiere PDF, JPEG și PNG sunt acceptate.");
    else if (file && file.size > MAX_LAB_SIZE)
      setLabFileError("Dimensiunea fișierului nu trebuie să depășească 10 MB.");
  };

  const onUploadLabResult = async () => {
    if (!labFile) { setLabFileError("Selectați un fișier."); return; }
    if (labFileError) return;
    setIsLabUploading(true);
    try {
      await uploadLabResult(patientId, labFile);
      setIsLabModalOpen(false);
      setLabFile(null);
      toast.success("Rezultatul de laborator a fost încărcat cu succes.");
      setIsLabResultsLoading(true);
      void fetchLabResults(patientId).finally(() => setIsLabResultsLoading(false));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Eroare la încărcarea rezultatului de laborator.";
      toast.error(msg);
    } finally {
      setIsLabUploading(false);
    }
  };

  const downloadAttachment = async (att: Attachment) => {
    let href = att.url;
    if (!att.file) {
      const blob = await api.getFile(`/api/attachments/${att.id}/file`);
      href = URL.createObjectURL(blob);
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = att.name;
    a.click();
  };

  const age = calculateAge(patient.dateOfBirth);

  const addEmptyDrug = () => {
    append({
      name: "", genericName: "", dose: "", route: "Oral", frequency: "Once daily",
      duration: "", quantity: "", refills: "", instructions: "", indication: "",
      startDate: new Date().toISOString().split("T")[0], endDate: "",
    });
  };

  const handleVoiceResult = (result: VoiceToMedicalRecordResponse) => {
    if (result.chiefComplaint) setValue("chiefComplaint", result.chiefComplaint, { shouldValidate: true });
    if (result.diagnosis || result.icdCode) {
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      let matched = result.icdCode
        ? ICD10_RO.find(e => e.code.toLowerCase() === result.icdCode!.toLowerCase())
        : undefined;
      if (!matched && result.diagnosis) {
        const q = normalize(result.diagnosis);
        matched = ICD10_RO.find(e => normalize(e.description).includes(q))
          ?? ICD10_RO.find(e => q.includes(normalize(e.description)));
      }
      if (matched) {
        setValue("icdCode", matched.code, { shouldValidate: true });
        setValue("diagnosis", matched.description, { shouldValidate: true });
      } else {
        if (result.icdCode)    setValue("icdCode", result.icdCode, { shouldValidate: true });
        if (result.diagnosis)  setValue("diagnosis", result.diagnosis, { shouldValidate: true });
      }
    }
    if (result.secondaryDiagnoses) setValue("secondaryDiagnoses", result.secondaryDiagnoses, { shouldValidate: true });
    if (result.symptoms)       setValue("symptoms", result.symptoms, { shouldValidate: true });
    if (result.physicalExam)   setValue("physicalExam", result.physicalExam, { shouldValidate: true });
    if (result.treatment)      setValue("treatment", result.treatment, { shouldValidate: true });
    if (result.procedures)     setValue("procedures", result.procedures, { shouldValidate: true });
    if (result.urgency)        setValue("urgency", result.urgency as UrgencyLevel, { shouldValidate: true });
    if (result.followUpIn)     setValue("followUpIn", result.followUpIn, { shouldValidate: true });
    if (result.followUpType)   setValue("followUpType", result.followUpType, { shouldValidate: true });
    if (result.referral)       setValue("referral", result.referral, { shouldValidate: true });
    if (result.patientEducation) setValue("patientEducation", result.patientEducation, { shouldValidate: true });

    if (result.vitalSigns) {
      const vs = result.vitalSigns;
      if (vs.bloodPressure)    setValue("bp", vs.bloodPressure, { shouldValidate: true });
      if (vs.heartRate)        setValue("hr", vs.heartRate, { shouldValidate: true });
      if (vs.temperature)      setValue("temp", vs.temperature, { shouldValidate: true });
      if (vs.respiratoryRate)  setValue("rr", vs.respiratoryRate, { shouldValidate: true });
      if (vs.oxygenSaturation) setValue("spo2", vs.oxygenSaturation, { shouldValidate: true });
      if (vs.weight)           setValue("weight", vs.weight, { shouldValidate: true });
      if (vs.height)           setValue("height", vs.height, { shouldValidate: true });
    }

    if (result.prescribedDrugs && result.prescribedDrugs.length > 0) {
      result.prescribedDrugs.forEach((drug) => {
        append({
          name:         drug.name ?? "",
          genericName:  drug.genericName ?? "",
          dose:         drug.dose ?? "",
          route:        (drug.route as RouteOfAdministration) ?? "Oral",
          frequency:    (drug.frequency as DrugFrequency) ?? "",
          duration:     drug.duration ?? "",
          quantity:     drug.quantity ?? "",
          refills:      "",
          instructions: drug.instructions ?? "",
          indication:   drug.indication ?? "",
          startDate:    new Date().toISOString().split("T")[0],
          endDate:      "",
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" className="gap-1.5 -ml-2 text-sm" onClick={() => onNavigate("patients")}>
        <ArrowLeft className="w-4 h-4" /> Înapoi la pacienți
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
                  {age} ani · {patient.sex} · Data nasterii: {formatDate(patient.dateOfBirth)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="solid" accent="info" className="text-sm px-3 py-1">
                  <Droplets className="w-3.5 h-3.5 mr-1" />{patient.bloodType}
                </Badge>
                {isLabDoctor && (
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-400 gap-1.5">
                    <FlaskConical className="w-3 h-3" />Acces laborator doar
                  </Badge>
                )}
                {canAddRecords && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate(`edit-patient-${patientId}`)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {isSpecialist ? "Edit Medical Info" : "Edit Pacient"}
                  </Button>
                )}
                {canScheduleAppointments && (
                  <Button
                    size="sm"
                    onClick={() => onNavigate(`create-appointment-patient-${patientId}`)}
                    className="gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />Programare Intervenție
                  </Button>
                )}
                {canAddLabResults && isLabDoctor && (
                  <Button size="sm" variant="outline" onClick={() => setIsLabModalOpen(true)} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" />Încarcare Rezultat Laboratoe
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
                  <span className="text-xs text-destructive font-medium">Alergii: {patient.allergies}</span>
                </div>
              )}
              {patient.currentMedications && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                  <Pill className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Medicamentație: {patient.currentMedications}
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
              <ClipboardList className="w-3.5 h-3.5" /><span className="hidden sm:inline">Istoric Medical</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="lab-results" className="gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="w-3.5 h-3.5" /><span className="hidden sm:inline">Rezultate Laborator</span>
          </TabsTrigger>
          {!isLabDoctor && (
            <TabsTrigger value="appointments" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5" /><span className="hidden sm:inline">Programări</span>
            </TabsTrigger>
          )}
          {!isLabDoctor && (
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
              <StickyNote className="w-3.5 h-3.5" /><span className="hidden sm:inline">Note</span>
            </TabsTrigger>
          )}
          {isLabDoctor && (
            <TabsTrigger value="patient-info" className="gap-1.5 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5" /><span className="hidden sm:inline">Info Pacient</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Personal ── */}
        <TabsContent value="personal">
          <Card>
            <CardHeader><CardTitle className="text-base">Info Personale</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Nume complet", value: patient.fullName, icon: <User className="w-4 h-4" /> },
                  { label: "Data nașterii", value: formatDate(patient.dateOfBirth), icon: <Calendar className="w-4 h-4" /> },
                  { label: "Vârstă", value: `${age} ani`, icon: <User className="w-4 h-4" /> },
                  { label: "Sex", value: patient.sex, icon: <User className="w-4 h-4" /> },
                  { label: "ID Național", value: patient.nationalId, icon: <CreditCard className="w-4 h-4" /> },
                  { label: "Tip de sânge", value: patient.bloodType, icon: <Droplets className="w-4 h-4" /> },
                  { label: "Telefon", value: patient.phone, icon: <Phone className="w-4 h-4" /> },
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
                    <AlertTriangle className="w-4 h-4" />Alergii
                  </p>
                  <p className="text-sm font-medium">{patient.allergies || "Niciuna documentată"}</p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Pill className="w-4 h-4" />Medicamente curente
                  </p>
                  <p className="text-sm font-medium">{patient.currentMedications || "Niciuna documentată"}</p>
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
                <span>Doctorul de Laborator are drept de citire la informațiile pacientului și poate încărca rezultatele de laborator.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Nume complet", value: patient.fullName },
                  { label: "Data nașterii", value: formatDate(patient.dateOfBirth) },
                  { label: "Sex", value: patient.sex },
                  { label: "Tip de sânge", value: patient.bloodType },
                  { label: "ID Național", value: patient.nationalId },
                  { label: "Telefon", value: patient.phone },
                  { label: "Email", value: patient.email },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
                {patient.allergies && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Alergii</p>
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
              Istoric Medical
            </h3>
            {canAddRecords && (
              <Button size="sm" onClick={openAddModal} className="gap-1.5">
                <Plus className="w-4 h-4" />Adaugă înregistrare
              </Button>
            )}
          </div>

          {isMedicalRecordsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Încărcare înregistrări medicale…</span>
            </div>
          ) : medicalRecords.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nu există înregistrări medicale încă</EmptyTitle>
                <EmptyDescription>Adaugă prima înregistrare medicală pentru acest pacient.</EmptyDescription>
              </EmptyHeader>
              {canAddRecords && (
                <EmptyContent>
                  <Button onClick={openAddModal} className="gap-2">
                    <Plus className="w-4 h-4" />Adaugă înregistrare
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
                  const urgStyle = urgencyConfig[urg]?.color ?? urgencyConfig.Rutină.color;
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
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${urgStyle}`}>
                                {urg}
                              </span>
                              {canEditRecord(record) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditRecord(record)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {record.chiefComplaint && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              <span className="font-medium text-foreground">Plângere principală:</span>{" "}
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
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Diagnostice secundare</p>
                              <div className="flex flex-wrap gap-1.5">
                                {record.secondaryDiagnoses.split("; ").filter(Boolean).map((item) => (
                                  <Badge key={item} variant="secondary" className="text-xs font-normal">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Symptoms */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Simptome</p>
                            <p className="text-sm">{record.symptoms}</p>
                          </div>

                          {/* Physical Exam */}
                          {record.physicalExam && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Examinare fizică</p>
                              <p className="text-sm">{record.physicalExam}</p>
                            </div>
                          )}

                          {/* Treatment narrative */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Plan de tratament</p>
                            <p className="text-sm leading-relaxed">{record.treatment}</p>
                          </div>

                          {/* Prescribed Drugs */}
                          {(record.prescribedDrugs?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5" />
                                Medicamente prescrise ({record.prescribedDrugs?.length ?? 0})
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
                                <Activity className="w-3.5 h-3.5" />Proceduri
                              </p>
                              <p className="text-sm">{record.procedures}</p>
                            </div>
                          )}

                          {/* Follow-up + Referral */}
                          {(record.followUpIn || record.referral) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {record.followUpIn && (
                                <div className="rounded-lg bg-muted/50 border border-border p-3">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Programare de urmărire</p>
                                  <p className="text-sm font-medium">{record.followUpIn}</p>
                                  {record.followUpType && (
                                    <p className="text-xs text-muted-foreground">{record.followUpType}</p>
                                  )}
                                </div>
                              )}
                              {record.referral && (
                                <div className="rounded-lg bg-muted/50 border border-border p-3">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" />Recomandare
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
                                <BookOpen className="w-3.5 h-3.5" />Educație pentru pacient
                              </p>
                              <p className="text-sm text-blue-800 dark:text-blue-300">{record.patientEducation}</p>
                            </div>
                          )}

                          {/* Attachments */}
                          {(record.attachments?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                Atasamente ({record.attachments!.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {record.attachments!.map((att) => (
                                  <button
                                    key={att.id}
                                    onClick={() => void downloadAttachment(att)}
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

                          {/* Lab Request Status */}
                          {record.labRequest && (
                            <div className="flex items-center gap-2 pt-1">
                              <FlaskConical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">Cerere laborator</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                                record.labRequest.status === "În așteptare"
                                  ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
                                  : record.labRequest.status === "În procesare"
                                  ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
                                  : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                              }`}>
                                {record.labRequest.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                · {record.labRequest.sampleTypes.join(", ")}
                              </span>
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
        <TabsContent value="lab-results" className="space-y-6">
          {/* Lab Requests sub-section */}
          {labRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />Cereri de laborator
              </h3>
              <div className="space-y-3">
                {labRequests.map((req) => (
                  <div key={req.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {req.sampleTypes.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                            {s === "lcr" ? "LCR" : s}
                          </span>
                        ))}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0 ${
                        req.status === "În așteptare"
                          ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
                          : req.status === "În procesare"
                          ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
                          : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cerut de {req.requestedByDoctorName} · {formatDate(req.createdAt)}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>
                    )}
                    {req.results.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultate</p>
                        {req.results.map((res) => (
                          <div key={res.id} className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs space-y-1">
                            {res.observations && <p className="text-sm">{res.observations}</p>}
                            {res.labResultFileName && (
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />{res.labResultFileName}
                              </p>
                            )}
                            <p className="text-muted-foreground">Submitted by {res.submitterName} · {formatDateTime(res.submittedAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lab doctor — Start Processing */}
                    {isLabDoctor && req.status === "În așteptare" && (
                      <div className="pt-2 border-t border-border">
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          disabled={processingReqId === req.id}
                          onClick={() => void handleStartLabProcessing(req.id)}
                        >
                          {processingReqId === req.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <FlaskConical className="w-4 h-4" />}
                          În procesare
                        </Button>
                      </div>
                    )}

                    {/* Lab doctor — Submit Results */}
                    {isLabDoctor && req.status === "În procesare" && (
                      <div className="pt-2 border-t border-border space-y-3">
                        {expandedReqId !== req.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => { setExpandedReqId(req.id); setLabReqObs(""); setLabReqFile(null); }}
                          >
                            <CheckCircle2 className="w-4 h-4" />Rezultate încărcate
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Observații</Label>
                              <Textarea
                                value={labReqObs}
                                onChange={(e) => setLabReqObs(e.target.value)}
                                placeholder="Adaugă rezultate, măsurători, sau observații..."
                                rows={3}
                                className="resize-none text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Atașează fișier (PDF / JPEG / PNG, max 10 MB)</Label>
                              {labReqFile ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm border border-border">
                                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                                  <span className="flex-1 truncate">{labReqFile.name}</span>
                                  <span className="text-xs text-muted-foreground">{formatFileSize(labReqFile.size)}</span>
                                  <button
                                    type="button"
                                    onClick={() => { setLabReqFile(null); if (labReqFileRef.current) labReqFileRef.current.value = ""; }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => labReqFileRef.current?.click()}
                                  className="w-full flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary text-sm"
                                >
                                  <Upload className="w-4 h-4" />
                                  Click să incarci un fișier de rezultat
                                </button>
                              )}
                              <input
                                ref={labReqFileRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setLabReqFile(f);
                                }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setExpandedReqId(null); setLabReqObs(""); setLabReqFile(null); }}
                              >
                                Anulează
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 gap-2"
                                disabled={submittingReqId === req.id}
                                onClick={() => void handleSubmitLabResult(req.id)}
                              >
                                {submittingReqId === req.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <CheckCircle2 className="w-4 h-4" />}
                                Submit
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Lab Results */}
          <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lab Results</h3>
            {canAddLabResults && (
              <Button size="sm" onClick={() => setIsLabModalOpen(true)} className="gap-1.5">
                <Upload className="w-4 h-4" />Încarcă rezultate
              </Button>
            )}
          </div>
          {isLabResultsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Încărcare rezultate de laborator...</span>
            </div>
          ) : labResults.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Niciun fișier de rezultate</EmptyTitle>
                <EmptyDescription>Nu au fost încărcate fișiere de rezultate de laborator.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {labResults.map((result) => {
                const insight = getLabAIInsight(result.id);
                const isLoading = !!labAIInsightLoading[result.id];
                const status = result.aiProcessingStatus;
                return (
                  <div key={result.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                        <Paperclip className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{result.originalFileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(result.uploadedAt)} · {formatFileSize(result.fileSizeBytes)} · Încărcat de {result.uploaderName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isLabDoctor && (status === "pending" || status === "processing") ? (
                          <span className="text-xs text-muted-foreground">AI în curs...</span>
                        ) : !isLabDoctor && status === "completed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950/30"
                            disabled={isLoading}
                            onClick={() => void handleOpenInsight(result.id)}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            {isLoading ? "Se încarcă..." : insight ? "Insight AI" : "Analiză AI"}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={async () => {
                            try {
                              const url = await getLabResultDownloadUrl(result.id);
                              window.open(url, "_blank", "noopener,noreferrer");
                            } catch {
                              toast.error("Nu s-a putut descărca fișierul. Vă rugăm să încercați din nou.");
                            }
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />Vezi
                        </Button>
                      </div>
                    </div>
                    {insight && !isLabDoctor && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI · {insight.urgency}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{insight.summary}</p>
                        <button
                          className="text-xs font-medium mt-1 underline underline-offset-2 text-amber-700 dark:text-amber-400 hover:opacity-80"
                          onClick={() => setInsightModal(insight)}
                        >
                          Detalii complete →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Insight Modal */}
          <Dialog open={!!insightModal} onOpenChange={(o) => { if (!o) setInsightModal(null); }}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> Analiză AI rezultate laborator
                  </DialogTitle>
                </DialogHeader>
                {insightModal && (() => {
                  const urgencyConfig: Record<string, { color: string; icon: React.ReactNode }> = {
                    Normal: { color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 className="w-4 h-4" /> },
                    Monitor: { color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800", icon: <TrendingUp className="w-4 h-4" /> },
                    "Consult Doctor": { color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: <AlertTriangle className="w-4 h-4" /> },
                    Urgent: { color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: <AlertTriangle className="w-4 h-4" /> },
                  };
                  const cfg = urgencyConfig[insightModal.urgency] ?? urgencyConfig["Normal"];
                  return (
                    <div className="space-y-5">
                      <div className={`flex items-center gap-2 p-3 rounded-xl border font-semibold text-sm ${cfg.color}`}>
                        {cfg.icon} {insightModal.urgency}
                      </div>
                      <div className={`grid gap-4 ${!isSpecialist && !isLabDoctor && !isAdmin ? "md:grid-cols-2" : "grid-cols-1"}`}>
                        {/* Doctor variant */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Varianta clinică (doctor)</p>
                          {insightModal.summary && <p className="text-sm leading-relaxed">{insightModal.summary}</p>}
                          {(insightModal.findings?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Constatări</p>
                              <ul className="space-y-1">
                                {insightModal.findings!.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(insightModal.recommendations?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Recomandări</p>
                              <ul className="space-y-1">
                                {insightModal.recommendations!.map((r, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />{r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {/* Patient variant — hidden for doctor roles */}
                        {!isSpecialist && !isLabDoctor && !isAdmin && insightModal.summaryPatient && (
                          <div className="space-y-3 bg-muted/40 rounded-xl p-3 border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Varianta pacient (limbaj simplu)</p>
                            <p className="text-sm leading-relaxed">{insightModal.summaryPatient}</p>
                            {(insightModal.findingsPatient?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Constatări</p>
                                <ul className="space-y-1">
                                  {insightModal.findingsPatient!.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(insightModal.recommendationsPatient?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Recomandări</p>
                                <ul className="space-y-1">
                                  {insightModal.recommendationsPatient!.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />{r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                        {insightModal.disclaimer}
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        Generat la {formatDateTime(insightModal.generatedAt)}
                      </p>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </div>{/* end Uploaded Lab Results */}
        </TabsContent>

        {/* ── Appointments ── */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Istoric programări
            </h3>
            {canScheduleAppointments && (
              <Button size="sm" onClick={() => onNavigate(`create-appointment-patient-${patientId}`)} className="gap-1.5">
                <Plus className="w-4 h-4" />Programat
              </Button>
            )}
          </div>

          {patientApptLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Încărcare programări...</span>
            </div>
          ) : patientAppointments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nu există programări</EmptyTitle>
                <EmptyDescription>Programează prima vizită.</EmptyDescription>
              </EmptyHeader>
              {canScheduleAppointments && (
                <EmptyContent>
                  <Button onClick={() => onNavigate(`create-appointment-patient-${patientId}`)} className="gap-2">
                    <CalendarDays className="w-4 h-4" />Programare vizită
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
                const normalizedStatus = normalizeAppointmentStatus(apt.status);

                const statusStyles: Record<string, string> = {
                  Planificată: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
                  Finalizată: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
                  Anulată: "text-muted-foreground bg-muted border-border",
                };
                const statusIcons: Record<string, React.ReactNode> = {
                  Planificată: <AlertCircle className="w-3 h-3" />,
                  Finalizată: <CheckCircle2 className="w-3 h-3" />,
                  Anulată: <XCircle className="w-3 h-3" />,
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
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyles[normalizedStatus]}`}
                          >
                            {statusIcons[normalizedStatus]}
                            {normalizedStatus}
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
                      {normalizedStatus !== "Finalizată" && (
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
                            {normalizedStatus === "Planificată" && (
                              <DropdownMenuItem
                                onClick={() => handleApptStatusChange(apt.id, "Finalizată")}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                Marchează ca finalizată
                              </DropdownMenuItem>
                            )}
                            {normalizedStatus === "Planificată" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleApptStatusChange(apt.id, "Anulată")}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Anulează programare
                              </DropdownMenuItem>
                            )}
                            {normalizedStatus === "Anulată" && (
                              <DropdownMenuItem
                                onClick={() => handleApptStatusChange(apt.id, "Planificată")}
                              >
                                <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                                Reprogramează
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Note de clinică</h3>
            {canAddNotes && (
              <Button size="sm" onClick={openAddNoteModal} className="gap-1.5">
                <Plus className="w-4 h-4" />Adaugă notă
              </Button>
            )}
          </div>
          {isNotesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nicio notă de clinică</EmptyTitle>
                <EmptyDescription>Adaugă prima notă de clinică pentru acest pacient.</EmptyDescription>
              </EmptyHeader>
              {canAddNotes && (
                <EmptyContent>
                  <Button onClick={openAddNoteModal} className="gap-2">
                    <Plus className="w-4 h-4" />Adaugă notă
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{note.author}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(note.date)}</p>
                    </div>
                    {canManageNote(note.authorId) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            resetEditNote({ content: note.content });
                            setIsEditNoteModalOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={() => void onDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
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
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                {editingRecord ? "Editează" : "Adaugă Record Medical"}
              </DialogTitle>
              {canAddRecords && (
                <VoiceRecorderButton onResult={handleVoiceResult} />
              )}
            </div>
          </DialogHeader>

          <form id="record-form" onSubmit={handleSubmit(onSaveRecord)} className="flex-1 overflow-y-auto">
            <div className="px-8 py-6">
            {/* ═══ TWO-COLUMN LAYOUT ═══ */}
            <div className="grid grid-cols-2 gap-x-8">

              {/* ── LEFT COLUMN ── */}
              <div className="space-y-5">

                {/* Section 1: Visit info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Informații despre vizită
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Data" required error={errors.date?.message}>
                      <Input type="date" {...register("date")} />
                    </FormField>
                    <FormField label="Urgență" required error={errors.urgency?.message}>
                      <Select value={watch("urgency") ?? "Rutină"} onValueChange={(v) => setValue("urgency", v as UrgencyLevel)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {URGENCY_LEVELS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Tip vizită" required error={errors.visitType?.message}>
                      <Select value={watch("visitType") ?? "În persoană"} onValueChange={(v) => setValue("visitType", v as MedicalRecordFormData["visitType"])}>
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
                    <Stethoscope className="w-3.5 h-3.5" />Diagnostic
                  </h3>
                  <FormField label="Acuza principala" required error={errors.chiefComplaint?.message}>
                    <Input {...register("chiefComplaint")} placeholder="Motivul principal al consultatiei" />
                  </FormField>
                  <FormField label="Diagnostic primar ICD-10" required error={errors.diagnosis?.message}>
                    <IcdSearchField
                      codeValue={watch("icdCode") ?? ""}
                      descriptionValue={watch("diagnosis") ?? ""}
                      onChange={(code, description) => {
                        setValue("icdCode", code, { shouldValidate: true });
                        setValue("diagnosis", description, { shouldValidate: true });
                      }}
                      error={errors.diagnosis?.message}
                    />
                  </FormField>
                  <FormField label="Diagnostice secundare" error={errors.secondaryDiagnoses?.message}>
                    <IcdMultiSearchField
                      value={watch("secondaryDiagnoses") ?? ""}
                      onChange={(v) => setValue("secondaryDiagnoses", v, { shouldValidate: true })}
                      error={errors.secondaryDiagnoses?.message}
                    />
                  </FormField>
                </div>

                {/* Section 3: Clinical findings */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />Constatări clinice
                  </h3>
                  <FormField label="Simptome" required error={errors.symptoms?.message}>
                    <Textarea {...register("symptoms")} placeholder="Descrie simptomele pacientului în detaliu..." rows={3} />
                  </FormField>
                  <FormField label="Găsele de examen fizic" error={errors.physicalExam?.message}>
                    <Textarea {...register("physicalExam")} placeholder="ex. Sensibilitate la nivelul ACV pe partea dreaptă ++. Abdomen moale..." rows={2} />
                  </FormField>
                </div>

                {/* Section 4: Vital signs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> Semne vitale
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: "bp" as const,     label: "Presiunea arterială",  placeholder: "120/80 mmHg",  icon: <Activity className="w-3 h-3" /> },
                      { field: "hr" as const,     label: "Frecvența cardiacă",      placeholder: "72 bpm",       icon: <Heart className="w-3 h-3" /> },
                      { field: "temp" as const,   label: "Temperatura",     placeholder: "37.0 °C",      icon: <Thermometer className="w-3 h-3" /> },
                      { field: "rr" as const,     label: "Frecvența respiratorie",placeholder: "16 /min",      icon: <Wind className="w-3 h-3" /> },
                      { field: "spo2" as const,   label: "Saturatia de oxigen",            placeholder: "98 %",         icon: <Eye className="w-3 h-3" /> },
                      { field: "weight" as const, label: "Greutate",          placeholder: "70 kg",        icon: <Weight className="w-3 h-3" /> },
                      { field: "height" as const, label: "Înălțime",          placeholder: "175 cm",       icon: <User className="w-3 h-3" /> },
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
                    <ClipboardList className="w-3.5 h-3.5" />Plan de tratament
                  </h3>
                  <FormField label="Tratament" required error={errors.treatment?.message}>
                    <Textarea {...register("treatment")} placeholder="Descrie abordarea generală de tratament, intervențiile și deciziile clinice luate..." rows={3} />
                  </FormField>
                  <FormField label="Proceduri efectuate" error={errors.procedures?.message}>
                    <Input {...register("procedures")} placeholder="de ex. CT abdomen/pelvin, acces intravenos, analiză de urină" />
                  </FormField>
                </div>

                {/* Section 6: Follow-up & Referral */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Consultatie viitoare și trimitere
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Următoarea consultatie" error={errors.followUpIn?.message}>
                      <Input {...register("followUpIn")} placeholder="de ex. 1 săptămână, 3 luni" />
                    </FormField>
                    <FormField label="Tipul consultatiei" error={errors.followUpType?.message}>
                      <Select value={watch("followUpType") ?? ""} onValueChange={(v) => setValue("followUpType", v)}>
                        <SelectTrigger><SelectValue placeholder="Selectează tipul de consultatie" /></SelectTrigger>
                        <SelectContent>
                          {FOLLOW_UP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="Trimitere" error={errors.referral?.message}>
                    <Input {...register("referral")} placeholder="de ex. Urologie — Dr. Mihail — în termen de 1 săptămână" />
                  </FormField>
                </div>

                {/* Section 7: Patient education */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />Educație pentru pacient
                  </h3>
                  <FormField label="Instrucțiuni oferite pacientului" error={errors.patientEducation?.message}>
                    <Textarea
                      {...register("patientEducation")}
                      placeholder="Sfaturi pentru stilul de viață, semne de avertizare de urmărit, instrucțiuni privind medicamentele..."
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
                      <Pill className="w-3.5 h-3.5" />Medicamente prescrise ({fields.length})
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addEmptyDrug} className="gap-1.5 h-7 text-xs">
                      <Plus className="w-3.5 h-3.5" />Adaugă medicament
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <button
                      type="button"
                      onClick={addEmptyDrug}
                      className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Pill className="w-8 h-8" />
                      <span className="text-sm font-medium">Nu există medicamente prescrise încă</span>
                      <span className="text-xs">Click pentru a adăuga o prescripție de medicament</span>
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
                        <Plus className="w-4 h-4" />Adaugă un alt medicament
                      </Button>
                    </div>
                  )}
                </div>

                {/* Section 9: Attachments */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />Atașamente
                  </h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-sm font-medium text-muted-foreground">Click pentru a încărca fișiere</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF, PNG, JPG până la 10MB fiecare</p>
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

                {/* Section 10: Laboratory Samples */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5" />Mostre de Laborator
                  </h3>
                  {editingRecord?.labRequest && editingRecord.labRequest.status !== "În așteptare" ? (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm">
                      <FlaskConical className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Cerere de laborator este</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        editingRecord.labRequest.status === "În procesare"
                          ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
                          : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                      }`}>
                        {editingRecord.labRequest.status}
                      </span>
                      <span className="text-muted-foreground text-xs">— nu poate fi modificată</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {(["sânge", "urină", "scaun", "lcr", "spută", "țesut", "altele"] as SampleType[]).map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedSamples.includes(s)}
                              onChange={(e) =>
                                setSelectedSamples((prev) =>
                                  e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)
                                )
                              }
                              className="w-4 h-4 rounded border-border accent-primary"
                            />
                            <span className="text-sm capitalize">{s === "lcr" ? "LCR" : s}</span>
                          </label>
                        ))}
                      </div>
                      {selectedSamples.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Notițe pentru laborator (optional)</Label>
                          <Textarea
                            value={labRequestNotes}
                            onChange={(e) => setLabRequestNotes(e.target.value)}
                            placeholder="Instrucțiuni speciale pentru laborator, teste specifice de efectuat, sau alte informații relevante despre mostre..."
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      )}
                      {editingRecord?.labRequest?.status === "În așteptare" && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Se va actualiza.
                        </p>
                      )}
                    </>
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
              <span>Acest record este protejat sub HIPAA. Asigurați-vă că toate informațiile introduse sunt exacte și relevantă clinic.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="secondary" onClick={closeModal}>Anulează</Button>
              <Button type="submit" form="record-form" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? "Salvare..." : editingRecord ? "Salvează modificările" : "Salvează record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Note Modal ── */}
      <Dialog open={isNoteModalOpen} onOpenChange={(open) => { if (!open) { setIsNoteModalOpen(false); resetNote(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adaugă Notă Clinică</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNoteSubmit(onAddNote)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Note <span className="text-destructive">*</span></Label>
              <Textarea
                {...registerNote("content")}
                placeholder="Adaugă observații clinice, notițe de urmărire sau alte informații relevante..."
                rows={5}
              />
              {noteErrors.content && <p className="text-xs text-destructive">{noteErrors.content.message}</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              Signed as: <strong>{user?.name}</strong> · {new Date().toLocaleDateString()}
            </p>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setIsNoteModalOpen(false); resetNote(); }}>
                Anulează
              </Button>
              <Button type="submit" disabled={isNoteSubmitting}>
                {isNoteSubmitting ? "Salvare..." : "Salvează notă"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Note Modal ── */}
      <Dialog open={isEditNoteModalOpen} onOpenChange={(open) => { if (!open) { setIsEditNoteModalOpen(false); setEditingNoteId(null); resetEditNote(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editează Notă Clinică</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditNoteSubmit(onEditNote)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Note <span className="text-destructive">*</span></Label>
              <Textarea
                {...registerEditNote("content")}
                placeholder="Adaugă observații clinice, notițe de urmărire sau alte informații relevante..."
                rows={5}
              />
              {editNoteErrors.content && <p className="text-xs text-destructive">{editNoteErrors.content.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setIsEditNoteModalOpen(false); setEditingNoteId(null); resetEditNote(); }}>
                Anulează
              </Button>
              <Button type="submit" disabled={isEditNoteSubmitting}>
                {isEditNoteSubmitting ? "Salvare..." : "Salvează modificările"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Upload Lab Result Modal ── */}
      <Dialog open={isLabModalOpen} onOpenChange={(open) => { if (!open) { setIsLabModalOpen(false); setLabFile(null); setLabFileError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              Upload Lab Result
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => document.getElementById("lab-file-input")?.click()}
            >
              <input
                id="lab-file-input"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleLabFileChange}
              />
              {labFile ? (
                <div className="flex items-center justify-center gap-3">
                  <Paperclip className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate">{labFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(labFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 w-7 h-7"
                    onClick={(e) => { e.stopPropagation(); setLabFile(null); setLabFileError(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium">Click pentru a selecta un fișier</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, sau PNG · max 10 MB</p>
                </>
              )}
            </div>
            {labFileError && <p className="text-xs text-destructive">{labFileError}</p>}
            <p className="text-xs text-muted-foreground">
              Încărcat de: <strong>{user?.name}</strong> · {new Date().toLocaleDateString()}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsLabModalOpen(false); setLabFile(null); setLabFileError(null); }}
            >
              Anulează
            </Button>
            <Button onClick={onUploadLabResult} disabled={isLabUploading || !labFile || !!labFileError}>
              {isLabUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Încărcare...</> : "Încarcă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
