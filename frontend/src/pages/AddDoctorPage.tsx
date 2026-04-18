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
import type { Doctor, DoctorRole } from "@/lib/types";

const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Phone number is required"),
  specialty: z.string().min(2, "Specialty is required"),
  licenseNumber: z.string().min(2, "License number is required"),
  department: z.string().min(2, "Department is required"),
  doctorRole: z.enum(["specialist_doctor", "lab_doctor"]),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

const SPECIALTIES = [
  "Cardiology", "Clinical Pathology", "Dermatology", "Emergency Medicine",
  "Endocrinology", "Family Medicine", "Gastroenterology", "General Surgery",
  "Hematology", "Internal Medicine", "Laboratory Medicine", "Microbiology",
  "Nephrology", "Neurology", "Oncology", "Orthopedics", "Pediatrics",
  "Psychiatry", "Pulmonology", "Radiology", "Urology", "Other",
];

const DEPARTMENTS = [
  "Cardiology", "Emergency", "Endocrinology", "Gastroenterology",
  "General Medicine", "Internal Medicine", "Laboratory", "Neurology",
  "Oncology", "Orthopedics", "Pediatrics", "Psychiatry", "Radiology",
  "Surgery", "Urology", "Other",
];

interface AddDoctorPageProps {
  onNavigate: (page: string) => void;
  editingDoctorId?: string | null;
}

export default function AddDoctorPage({ onNavigate, editingDoctorId }: AddDoctorPageProps) {
  const addDoctor = useAppStore((s) => s.addDoctor);
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const doctors = useAppStore((s) => s.doctors);

  const editingDoctor = editingDoctorId
    ? doctors.find((d) => d.id === editingDoctorId) ?? null
    : null;

  const isEditing = !!editingDoctor;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
          department: editingDoctor.department,
          doctorRole: editingDoctor.doctorRole,
        }
      : {
          doctorRole: "specialist_doctor",
          name: "",
          email: "",
          phone: "",
          specialty: "",
          department: "",
          licenseNumber: "",
        },
  });

  const selectedRole = watch("doctorRole");

  const onSubmit = async (data: DoctorFormData) => {
    await new Promise((r) => setTimeout(r, 400));
    if (isEditing && editingDoctor) {
      updateDoctor(editingDoctor.id, data);
    } else {
      addDoctor(data as Omit<Doctor, "id" | "createdAt">);
    }
    onNavigate("doctors");
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
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Doctor" : "Add New Doctor"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditing
              ? `Updating profile for ${editingDoctor?.name}`
              : "Register a new doctor in the system"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Role selection — first and most prominent */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <UserCog className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Doctor Role</h2>
          </div>
          <div className="p-5">
            <Label className="mb-3 block">Select role <span className="text-destructive">*</span></Label>
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
                    Specialist Doctor
                  </span>
                  {selectedRole === "specialist_doctor" && (
                    <Badge className="ml-auto text-[10px] bg-blue-500 hover:bg-blue-500 text-white border-0">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full clinical access — manage patients, create appointments, add notes, prescriptions, and view lab results.
                </p>
              </button>

              {/* Lab doctor card */}
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
                    Lab Doctor
                  </span>
                  {selectedRole === "lab_doctor" && (
                    <Badge className="ml-auto text-[10px] bg-purple-500 hover:bg-purple-500 text-white border-0">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Laboratory access only — upload and manage lab results for patients. No clinical record access.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Personal & professional info */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Stethoscope className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Professional Information</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Full name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Dr. Jane Smith"
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
                Specialty <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("specialty")}
                onValueChange={(v) => setValue("specialty", v)}
              >
                <SelectTrigger className={errors.specialty ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && (
                <p className="text-xs text-destructive">{errors.specialty.message}</p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label>
                <Building2 className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                Department <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("department")}
                onValueChange={(v) => setValue("department", v)}
              >
                <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department.message}</p>
              )}
            </div>

            {/* License number */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="licenseNumber">
                <BadgeCheck className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                License number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="licenseNumber"
                placeholder="e.g. MD-4821 or LAB-0012"
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

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate("doctors")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-32">
            <Save className="w-4 h-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Save changes"
              : "Add doctor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
