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
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["Male", "Female", "Other"]),
  nationalId: z.string().refine(isValidCNP, "Enter a valid 13-digit CNP."),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
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

  const editingPatient = editingPatientId
    ? patients.find((p) => p.id === editingPatientId) ?? null
    : null;

  const isEditing = !!editingPatient;
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
      const message = err instanceof Error ? err.message : "Failed to save patient. Please try again.";
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
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Patient" : "Add New Patient"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? `Updating record for ${editingPatient?.fullName}`
              : "Register a new patient in the system"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Personal Information</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="fullName">Full name <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                placeholder="e.g. Jane Elizabeth Smith"
                {...register("fullName")}
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
                Date of birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register("dateOfBirth")}
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
              >
                <SelectTrigger className={errors.sex ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CNP / National ID */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nationalId">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                CNP (Personal Numeric Code) <span className="text-destructive">*</span>
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
              />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{errors.nationalId.message}</p>
              )}
            </div>

            {/* Blood type */}
            <div className="space-y-1.5">
              <Label>
                <Droplets className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Blood type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("bloodType")}
                onValueChange={(v) => setValue("bloodType", v as BloodType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bt) => (
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
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...register("phone")}
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
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="patient@email.com"
                {...register("email")}
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
            <h2 className="text-sm font-semibold">Medical Information</h2>
            <Badge variant="outline" className="ml-auto text-[10px]">Optional</Badge>
          </div>
          <div className="p-5 space-y-5">
            {/* Allergies */}
            <div className="space-y-1.5">
              <Label htmlFor="allergies">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Known allergies
              </Label>
              <Textarea
                id="allergies"
                placeholder="e.g. Penicillin, Sulfonamides, Latex — or enter 'None known'"
                rows={3}
                {...register("allergies")}
              />
            </div>

            {/* Current medications */}
            <div className="space-y-1.5">
              <Label htmlFor="currentMedications">
                <Pill className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Current medications
              </Label>
              <Textarea
                id="currentMedications"
                placeholder="e.g. Lisinopril 10mg daily, Atorvastatin 20mg nightly"
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
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-32">
            <Save className="w-4 h-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Save changes"
              : "Add patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
