import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Stethoscope,
  Phone,
  Mail,
  Building2,
  BadgeCheck,
  FlaskConical,
  UserCog,
  Save,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { DoctorSummary } from "@/lib/types";

const doctorSchema = z.object({
  name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
  email: z.string().email("Introduceți un email valid"),
  phone: z.string().min(7, "Numărul de telefon este obligatoriu"),
  specialty: z.string().min(2, "Specialitatea este obligatorie"),
  licenseNumber: z.string().min(2, "Codul de identificare este obligatoriu"),
  departmentId: z.string().min(1, "Selectați un departament"),
  doctorRole: z.enum(["specialist_doctor", "lab_doctor"]),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

const LAB_SPECIALTY = "Medicină de laborator";

const SPECIALTIES = [
  "Cardiologie", "Patologie clinică", "Dermatologie", "Medicină de urgență",
  "Endocrinologie", "Medicină de familie", "Gastroenterologie", "Chirurgie generală",
  "Hematologie", "Medicină internă", "Medicină de laborator", "Microbiologie",
  "Nefrologie", "Neurologie", "Oncologie", "Ortopedie", "Pediatrie",
  "Psihiatrie", "Pneumologie", "Radiologie", "Urologie", "Altul",
];

interface AddDoctorPageProps {
  onNavigate: (page: string) => void;
  editingDoctorId?: string | null;
}

export default function AddDoctorPage({ onNavigate, editingDoctorId }: AddDoctorPageProps) {
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);

  const editingDoctor = editingDoctorId
    ? doctors.find((d) => d.id === editingDoctorId) ?? null
    : null;

  const isEditing = !!editingDoctor;

  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const labDept = departments.find(
    (d) => d.name.toLowerCase() === "laboratory"
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: isEditing
      ? {
          name: editingDoctor.name,
          email: editingDoctor.email,
          phone: editingDoctor.phone,
          specialty: editingDoctor.specialty,
          licenseNumber: editingDoctor.licenseNumber,
          departmentId: editingDoctor.departmentId,
          doctorRole: editingDoctor.doctorRole,
        }
      : {
          doctorRole: "specialist_doctor",
          name: "",
          email: "",
          phone: "",
          specialty: "",
          departmentId: "",
          licenseNumber: "",
        },
  });

  const selectedRole = watch("doctorRole");
  const isLabDoctor = selectedRole === "lab_doctor";

  // Auto-fill and lock specialty/department for Lab Doctor
  useEffect(() => {
    if (selectedRole === "lab_doctor") {
      setValue("specialty", LAB_SPECIALTY, { shouldValidate: true });
      if (labDept) {
        setValue("departmentId", labDept.id, { shouldValidate: true });
      }
    } else {
      if (watch("specialty") === LAB_SPECIALTY) setValue("specialty", "");
      if (labDept && watch("departmentId") === labDept.id) setValue("departmentId", "");
    }
  }, [selectedRole, labDept?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: DoctorFormData) => {
    setServerError(null);

    try {
      if (isEditing && editingDoctor) {
        const updated = await api.put<DoctorSummary>(`/api/doctors/${editingDoctor.id}`, data);
        updateDoctor(editingDoctor.id, updated);
      } else {
        await api.post<DoctorSummary>("/api/doctors", data);
      }
      await fetchDoctors();
      onNavigate("doctors");
    } catch (err: unknown) {
      const apiErr = err as { status?: number; payload?: { error?: string } };
      if (apiErr.status === 409) {
        const errCode = apiErr.payload?.error;
        if (errCode === "email_taken") {
          setError("email", { message: "Acest email este deja utilizat." });
        } else if (errCode === "license_taken") {
          setError("licenseNumber", { message: "Acest cod de identificare este deja înregistrat." });
        } else {
          setServerError("A apărut un conflict. Verificați datele introduse.");
        }
      } else if (apiErr.status === 400 && apiErr.payload?.error === "department_not_found") {
        setError("departmentId", { message: "Departamentul selectat nu mai există." });
      } else {
        setServerError(isEditing ? "Actualizarea medicului a eșuat. Încercați din nou." : "Crearea medicului a eșuat. Încercați din nou.");
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("doctors")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Editează medic" : "Adaugă medic nou"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? `Actualizare profil pentru ${editingDoctor?.name}`
              : "Înregistrează un medic nou în sistem"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Role selection */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <UserCog className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Rol medic</h2>
          </div>
          <div className="p-5">
            <Label className="mb-3 block">Selectează rol <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Specialist card */}
              <button
                type="button"
                onClick={() => setValue("doctorRole", "specialist_doctor")}
                className={`relative text-left rounded-lg border-2 p-4 transition-all cursor-pointer ${
                  selectedRole === "specialist_doctor"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-blue-300 bg-card"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-1.5 rounded-md ${selectedRole === "specialist_doctor" ? "bg-blue-100 dark:bg-blue-900/40" : "bg-muted"}`}>
                    <Stethoscope className={`w-4 h-4 ${selectedRole === "specialist_doctor" ? "text-blue-600" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`font-semibold text-sm ${selectedRole === "specialist_doctor" ? "text-blue-700 dark:text-blue-400" : "text-foreground"}`}>
                    Medic specialist
                  </span>
                  {selectedRole === "specialist_doctor" && (
                    <Badge className="ml-auto text-[10px] bg-blue-500 hover:bg-blue-500 text-white border-0">Selectat</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Acces clinic complet — gestionează pacienți, creează programări, adaugă notițe, rețete și vizualizează rezultate de laborator.
                </p>
              </button>

              {/* Lab Doctor card */}
              <button
                type="button"
                onClick={() => setValue("doctorRole", "lab_doctor")}
                className={`relative text-left rounded-lg border-2 p-4 transition-all cursor-pointer ${
                  selectedRole === "lab_doctor"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                    : "border-border hover:border-purple-300 bg-card"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-1.5 rounded-md ${selectedRole === "lab_doctor" ? "bg-purple-100 dark:bg-purple-900/40" : "bg-muted"}`}>
                    <FlaskConical className={`w-4 h-4 ${selectedRole === "lab_doctor" ? "text-purple-600" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`font-semibold text-sm ${selectedRole === "lab_doctor" ? "text-purple-700 dark:text-purple-400" : "text-foreground"}`}>
                    Medic laborator
                  </span>
                  {selectedRole === "lab_doctor" && (
                    <Badge className="ml-auto text-[10px] bg-purple-500 hover:bg-purple-500 text-white border-0">Selectat</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Acces exclusiv la laborator — încarcă și gestionează rezultate de laborator pentru pacienți. Fără acces la dosarul clinic.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Professional information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Stethoscope className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Informații profesionale</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Nume complet <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="ex. Dr. Ion Popescu"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Specialty */}
            <div className="space-y-1.5">
              <Label>
                <Stethoscope className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Specialitate <span className="text-destructive">*</span>
              </Label>
              {isLabDoctor ? (
                <div className="relative">
                  <Input
                    value={LAB_SPECIALTY}
                    disabled
                    className="pr-8 bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                  <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
              ) : (
                <Select
                  value={watch("specialty")}
                  onValueChange={(v) => setValue("specialty", v, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.specialty ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selectează specialitate" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isLabDoctor ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Fixat pentru rolul Medic laborator
                </p>
              ) : errors.specialty ? (
                <p className="text-xs text-destructive">{errors.specialty.message}</p>
              ) : null}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label>
                <Building2 className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Departament <span className="text-destructive">*</span>
              </Label>
              {isLabDoctor ? (
                <div className="relative">
                  <Input
                    value={labDept?.name ?? "Laboratory"}
                    disabled
                    className="pr-8 bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                  <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
              ) : (
                <Select
                  value={watch("departmentId")}
                  onValueChange={(v) => setValue("departmentId", v, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.departmentId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selectează departament" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isLabDoctor ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Fixat pentru rolul Medic laborator
                </p>
              ) : errors.departmentId ? (
                <p className="text-xs text-destructive">{errors.departmentId.message}</p>
              ) : null}
            </div>

            {/* License number */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="licenseNumber">
                <BadgeCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Cod de identificare <span className="text-destructive">*</span>
              </Label>
              <Input
                id="licenseNumber"
                placeholder="ex. MD-4821 sau LAB-0012"
                {...register("licenseNumber")}
                className={errors.licenseNumber ? "border-destructive" : ""}
              />
              {errors.licenseNumber && (
                <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact information */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Phone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Informații de contact</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Număr de telefon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40 700 000 000"
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
                Adresă email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@medkit.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Server error banner */}
        {serverError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate("doctors")}
          >
            Anulează
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-32">
            <Save className="w-4 h-4" />
            {isSubmitting
              ? "Se salvează..."
              : isEditing
              ? "Actualizează"
              : "Adaugă medic"}
          </Button>
        </div>
      </form>
    </div>
  );
}
