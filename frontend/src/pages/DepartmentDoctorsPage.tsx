import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowLeft,
  Phone,
  Mail,
  BadgeCheck,
  Stethoscope,
  FlaskConical,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import type { DoctorRole } from "@/lib/types";

interface DepartmentDoctorsPageProps {
  departmentId: string;
  departmentName: string;
  onNavigate: (page: string) => void;
}

const roleLabel = (role: DoctorRole) =>
  role === "specialist_doctor" ? "Specialist" : "Lab Doctor";

const roleBadgeClass = (role: DoctorRole) =>
  role === "specialist_doctor"
    ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
    : "border-purple-300 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30";

const avatarColor = (role: DoctorRole) =>
  role === "specialist_doctor"
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";

const RoleIcon = ({ role }: { role: DoctorRole }) =>
  role === "specialist_doctor" ? (
    <Stethoscope className="w-3.5 h-3.5" />
  ) : (
    <FlaskConical className="w-3.5 h-3.5" />
  );

export default function DepartmentDoctorsPage({
  departmentId,
  departmentName,
  onNavigate,
}: DepartmentDoctorsPageProps) {
  const doctors = useAppStore((s) => s.doctors);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDoctors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const departmentDoctors = useMemo(
    () => doctors.filter((d) => d.departmentId === departmentId),
    [doctors, departmentId]
  );

  const filteredDoctors = useMemo(() => {
    if (!searchQuery) return departmentDoctors;
    const q = searchQuery.toLowerCase();
    return departmentDoctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q)
    );
  }, [departmentDoctors, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => onNavigate("departments")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{departmentName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {departmentDoctors.length} doctor{departmentDoctors.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={() => onNavigate("add-doctor")}
          className="gap-2 sm:w-auto w-full"
        >
          <UserCog className="w-4 h-4" />
          Add Doctor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, specialty or license..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Doctor grid */}
      {departmentDoctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <UserCog className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">No doctors in this department</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add a doctor and assign them to {departmentName}.
          </p>
          <Button onClick={() => onNavigate("add-doctor")} variant="outline" className="gap-2">
            <UserCog className="w-4 h-4" />
            Add Doctor
          </Button>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-base font-medium text-foreground">No results</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-11 h-11">
                  <AvatarFallback className={`font-semibold text-sm ${avatarColor(doctor.doctorRole)}`}>
                    {getInitials(doctor.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm leading-tight">{doctor.name}</p>
                  <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doctor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doctor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doctor.licenseNumber}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border">
                <Badge
                  variant="outline"
                  className={`gap-1 text-xs px-2 py-0.5 ${roleBadgeClass(doctor.doctorRole)}`}
                >
                  <RoleIcon role={doctor.doctorRole} />
                  {roleLabel(doctor.doctorRole)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onNavigate(`edit-doctor-${doctor.id}`)}
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
