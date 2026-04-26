import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Droplets,
  CalendarDays,
  FileText,
  Pill,
  ShieldCheck,
  Save,
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
import { CNPInput } from "@/components/ui/cnp-input";
import { isValidCNP } from "@/lib/cnp";
import { useAppStore } from "@/lib/store";
import type { Patient, BloodType, Sex } from "@/lib/types";

const patientSchema = z.object({
  fullName: z.string().min(2, "Numele complet trebuie să aibă cel puțin 2 caractere"),
  dateOfBirth: z.string().min(1, "Data nașterii este obligatorie"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().refine(isValidCNP, "Introduceți un CNP valid de 13 cifre."),
  phone: z.string().min(7, "Numărul de telefon este obligatoriu"),
  email: z.string().email("Introduceți un email valid"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]),
  allergies: z.string(),
  currentMedications: z.string(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface AddPatientPageProps {
  onNavigate: (page: string) => void;
  editingPatientId?: string | null;
}

export default function AddPatientPage({ onNavigate, editingPatientId }: AddPatientPageProps) {
  const addPatient = useAppStore((s) => s.addPatient);
  const updatePatient = useAppStore((s) => s.updatePatient);
  const patients = useAppStore((s) => s.patients);
  const user = useAppStore((s) => s.user);

  const editingPatient = editingPatientId
    ? patients.find((p) => p.id === editingPatientId) ?? null
    : null;

  const isEditing = !!editingPatient;
  // Specialist doctors can only edit allergies and current medications
  const isRestrictedEdit = isEditing && user?.role === "specialist_doctor";
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: isEditing
      ? {
          fullName: editingPatient.fullName,
          dateOfBirth: editingPatient.dateOfBirth,
          sex: editingPatient.sex,
          nationalId: editingPatient.nationalId,
          phone: editingPatient.phone,
          email: editingPatient.email,
          bloodType: editingPatient.bloodType,
          allergies: editingPatient.allergies,
          currentMedications: editingPatient.currentMedications,
        }
      : {
          sex: "Male",
          bloodType: "Unknown",
          nationalId: "",
          allergies: "",
          currentMedications: "",
        },
  });

  const onSubmit = async (data: PatientFormData) => {
    setSubmitError(null);
    try {
      if (isEditing && editingPatient) {
        updatePatient(editingPatient.id, data);
        onNavigate(`patient-${editingPatient.id}`);
      } else {
        await addPatient(data as Omit<Patient, "id" | "createdAt" | "updatedAt">);
        onNavigate("patients");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Salvarea pacientului a eșuat. Vă rugăm să încercați din nou.";
      setSubmitError(message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(isEditing && editingPatient ? `patient-${editingPatient.id}` : "patients")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isRestrictedEdit ? "Editează informații medicale" : isEditing ? "Editează pacient" : "Adaugă pacient nou"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRestrictedEdit
              ? `Actualizare alergii și medicamente pentru ${editingPatient?.fullName}`
              : isEditing
              ? `Actualizare fișă pentru ${editingPatient?.fullName}`
              : "Înregistrați un pacient nou în sistem"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Informații personale</h2>
            {isRestrictedEdit && (
              <span className="ml-auto text-xs text-muted-foreground">Doar citire</span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="fullName">Nume complet <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                placeholder="ex. Maria Ionescu"
                {...register("fullName")}
                disabled={isRestrictedEdit}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* Date of birth */}
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">
                <CalendarDays className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Data nașterii <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register("dateOfBirth")}
                disabled={isRestrictedEdit}
                className={errors.dateOfBirth ? "border-destructive" : ""}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>

            {/* Sex */}
            <div className="space-y-1.5">
              <Label>Sex <span className="text-destructive">*</span></Label>
              <Select
                value={watch("sex")}
                onValueChange={(v) => setValue("sex", v as Sex)}
                disabled={isRestrictedEdit}
              >
                <SelectTrigger className={errors.sex ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Masculin</SelectItem>
                  <SelectItem value="Female">Feminin</SelectItem>
                  <SelectItem value="Other">Altul</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CNP / National ID */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nationalId">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                CNP <span className="text-destructive">*</span>
              </Label>
              <CNPInput
                id="nationalId"
                value={watch("nationalId") ?? ""}
                onChange={(v) => setValue("nationalId", v, { shouldValidate: true })}
                onParsed={(result) => {
                  if (result.valid) {
                    if (result.dateOfBirth) setValue("dateOfBirth", result.dateOfBirth, { shouldValidate: true });
                    if (result.sex) setValue("sex", result.sex as Sex, { shouldValidate: true });
                  }
                }}
                error={errors.nationalId?.message}
                disabled={isRestrictedEdit}
              />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{errors.nationalId.message}</p>
              )}
            </div>

            {/* Blood type */}
            <div className="space-y-1.5">
              <Label>
                <Droplets className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Grupă sanguină <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("bloodType")}
                onValueChange={(v) => setValue("bloodType", v as BloodType)}
                disabled={isRestrictedEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                  <SelectItem value="Unknown">Necunoscut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Phone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Informații de contact</h2>
            {isRestrictedEdit && (
              <span className="ml-auto text-xs text-muted-foreground">Doar citire</span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Telefon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40 700 000 000"
                {...register("phone")}
                disabled={isRestrictedEdit}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">
                <Mail className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="dvs@email.ro"
                {...register("email")}
                disabled={isRestrictedEdit}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Medical information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Informații medicale</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">Opțional</Badge>
          </div>
          <div className="p-5 space-y-5">
            {/* Allergies */}
            <div className="space-y-1.5">
              <Label htmlFor="allergies">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Alergii cunoscute
              </Label>
              <Textarea
                id="allergies"
                placeholder="ex. Penicilină, Sulfonamide, Latex — sau introduceți 'Fără alergii cunoscute'"
                rows={3}
                {...register("allergies")}
              />
            </div>

            {/* Current medications */}
            <div className="space-y-1.5">
              <Label htmlFor="currentMedications">
                <Pill className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Medicamente curente
              </Label>
              <Textarea
                id="currentMedications"
                placeholder="ex. Lisinopril 10mg zilnic, Atorvastatin 20mg seara"
                rows={3}
                {...register("currentMedications")}
              />
            </div>
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5">
            {submitError}
          </p>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate(isEditing && editingPatient ? `patient-${editingPatient.id}` : "patients")}
          >
            Anulează
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-32">
            <Save className="w-4 h-4" />
            {isSubmitting
              ? "Se salvează..."
              : isEditing
              ? "Actualizează pacient"
              : "Salvează pacient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
