import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  Users,
  FlaskConical,
  Stethoscope,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Phone,
  Mail,
  Building2,
  Award,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import type { Doctor, DoctorRole } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  specialty: z.string().min(2, "Specialty is required"),
  licenseNumber: z.string().min(2, "License number is required"),
  department: z.string().min(2, "Department is required"),
  phone: z.string().min(7, "Phone number is required"),
  doctorRole: z.enum(["specialist_doctor", "lab_doctor"]),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

// ─── Role config ──────────────────────────────────────────────────────────────

const roleConfig: Record<DoctorRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  specialist_doctor: {
    label: "Specialist Doctor",
    icon: <Stethoscope className="w-4 h-4" />,
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
    description: "Can add patients, create appointments, add notes, and manage medications.",
  },
  lab_doctor: {
    label: "Lab Doctor",
    icon: <FlaskConical className="w-4 h-4" />,
    color: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800",
    description: "Can only upload and manage laboratory results for patients.",
  },
};

export default function AdminPage() {
  const doctors = useAppStore((s) => s.doctors);
  const addDoctor = useAppStore((s) => s.addDoctor);
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const deleteDoctor = useAppStore((s) => s.deleteDoctor);
  const patients = useAppStore((s) => s.patients);
  const appointments = useAppStore((s) => s.appointments);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Doctor | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { doctorRole: "specialist_doctor" },
  });

  const filteredDoctors = filterRole === "all"
    ? doctors
    : doctors.filter((d) => d.doctorRole === filterRole);

  const specialists = doctors.filter((d) => d.doctorRole === "specialist_doctor").length;
  const labDoctors = doctors.filter((d) => d.doctorRole === "lab_doctor").length;

  const openAddModal = () => {
    setEditingDoctor(null);
    reset({ doctorRole: "specialist_doctor" });
    setIsModalOpen(true);
  };

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    reset({
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      department: doctor.department,
      phone: doctor.phone,
      doctorRole: doctor.doctorRole,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: DoctorFormData) => {
    await new Promise((r) => setTimeout(r, 400));
    if (editingDoctor) {
      updateDoctor(editingDoctor.id, data);
    } else {
      addDoctor({ ...data, departmentId: "" });
    }
    setIsModalOpen(false);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage doctors and system access
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-2 sm:w-auto w-full">
          <UserPlus className="w-4 h-4" />
          Add Doctor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{doctors.length}</p>
                <p className="text-xs text-muted-foreground">Total doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{specialists}</p>
                <p className="text-xs text-muted-foreground">Specialist doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{labDoctors}</p>
                <p className="text-xs text-muted-foreground">Lab doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role permissions info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(roleConfig) as [DoctorRole, typeof roleConfig[DoctorRole]][]).map(([role, cfg]) => (
          <div key={role} className={`rounded-xl border p-4 ${cfg.color}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {cfg.icon}
              <span className="font-semibold text-sm">{cfg.label}</span>
            </div>
            <p className="text-xs opacity-80">{cfg.description}</p>
          </div>
        ))}
      </div>

      {/* Filter + Doctor list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Doctors ({filteredDoctors.length})</h2>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="specialist_doctor">Specialist doctors</SelectItem>
              <SelectItem value="lab_doctor">Lab doctors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredDoctors.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No doctors found</EmptyTitle>
              <EmptyDescription>Add a doctor to get started.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={openAddModal} className="gap-2">
                <UserPlus className="w-4 h-4" />Add Doctor
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDoctors.map((doctor) => {
              const cfg = roleConfig[doctor.doctorRole];
              return (
                <div
                  key={doctor.id}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(doctor)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit doctor
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirm(doctor)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove doctor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Role badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{doctor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{doctor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{doctor.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono">{doctor.licenseNumber}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xl font-bold text-primary">{patients.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Patients</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xl font-bold text-blue-600">{appointments.filter(a => a.status === "Scheduled").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Scheduled appts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xl font-bold text-emerald-600">{appointments.filter(a => a.status === "Completed").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Completed appts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40 border border-border">
              <p className="text-xl font-bold text-muted-foreground">{doctors.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active doctors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Doctor Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) { setIsModalOpen(false); reset(); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Doctor Role */}
            <div className="space-y-1.5">
              <Label>Doctor type *</Label>
              <Select
                value={watch("doctorRole")}
                onValueChange={(v) => setValue("doctorRole", v as DoctorRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specialist_doctor">
                    <span className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      Specialist Doctor
                    </span>
                  </SelectItem>
                  <SelectItem value="lab_doctor">
                    <span className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      Lab Doctor
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {watch("doctorRole") && (
                <p className="text-xs text-muted-foreground mt-1">
                  {roleConfig[watch("doctorRole")].description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" placeholder="e.g. Dr. Jane Smith" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address *</Label>
                <Input id="email" type="email" placeholder="doctor@hospital.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number *</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              {/* Specialty */}
              <div className="space-y-1.5">
                <Label htmlFor="specialty">Specialty *</Label>
                <Input
                  id="specialty"
                  placeholder={watch("doctorRole") === "lab_doctor" ? "e.g. Clinical Pathology" : "e.g. Cardiology"}
                  {...register("specialty")}
                />
                {errors.specialty && <p className="text-xs text-destructive">{errors.specialty.message}</p>}
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  placeholder={watch("doctorRole") === "lab_doctor" ? "e.g. Laboratory" : "e.g. Internal Medicine"}
                  {...register("department")}
                />
                {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
              </div>

              {/* License */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="licenseNumber">License number *</Label>
                <Input
                  id="licenseNumber"
                  placeholder={watch("doctorRole") === "lab_doctor" ? "e.g. LAB-0042" : "e.g. MD-4821"}
                  {...register("licenseNumber")}
                />
                {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> After adding a doctor, their login credentials will use the email above with the system password{" "}
                <span className="font-mono font-bold">MedKit2025!</span>. Contact IT to set a custom password.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingDoctor ? "Save changes" : "Add doctor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove doctor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will remove <strong>{deleteConfirm?.name}</strong> from the system. They will no longer be able to log in.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) {
                  deleteDoctor(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Remove doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
