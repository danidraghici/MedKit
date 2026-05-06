import { useState, useMemo, useEffect } from "react";
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Stethoscope,
  MoreVertical,
  Edit,
  Trash2,
  FlaskConical,
  Building2,
  BadgeCheck,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import type { Doctor, DoctorRole } from "@/lib/types";

const PAGE_SIZE = 8;

interface DoctorsPageProps {
  onNavigate: (page: string) => void;
}

export default function DoctorsPage({ onNavigate }: DoctorsPageProps) {
  const doctors = useAppStore((s) => s.doctors);
  const deleteDoctor = useAppStore((s) => s.deleteDoctor);
  const fetchDoctors = useAppStore((s) => s.fetchDoctors);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDoctors(); }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<Doctor | null>(null);

  // ── Derived departments for the filter dropdown ───────────────────────────
  const allDepartments = useMemo(() => {
    const depts = Array.from(new Set(doctors.map((d) => d.department).filter(Boolean))).sort();
    return depts;
  }, [doctors]);

  // ── Filtered + paginated doctors ─────────────────────────────────────────
  const filteredDoctors = useMemo(() => {
    let filtered = doctors;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.licenseNumber.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q)
      );
    }
    if (filterRole !== "all") {
      filtered = filtered.filter((d) => d.doctorRole === filterRole);
    }
    if (filterDept !== "all") {
      filtered = filtered.filter((d) => d.department === filterDept);
    }
    return filtered;
  }, [doctors, searchQuery, filterRole, filterDept]);

  const totalPages = Math.ceil(filteredDoctors.length / PAGE_SIZE);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleDelete = (doctor: Doctor) => {
    deleteDoctor(doctor.id);
    setDeleteConfirm(null);
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  const roleLabel = (role: DoctorRole) =>
    role === "specialist_doctor" ? "Specialist" : "Medic laborator";

  const roleBadgeClass = (role: DoctorRole) =>
    role === "specialist_doctor"
      ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
      : "border-purple-300 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30";

  const RoleIcon = ({ role }: { role: DoctorRole }) =>
    role === "specialist_doctor" ? (
      <Stethoscope className="w-3.5 h-3.5" />
    ) : (
      <FlaskConical className="w-3.5 h-3.5" />
    );

  const avatarColor = (role: DoctorRole) =>
    role === "specialist_doctor"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medici</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {doctors.length} {doctors.length !== 1 ? "medici înregistrați" : "medic înregistrat"}
          </p>
        </div>
        <Button onClick={() => onNavigate("add-doctor")} className="gap-2 sm:w-auto w-full">
          <UserPlus className="w-4 h-4" />
          Adaugă medic
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Caută după nume, email, specialitate sau cod de identificare..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterRole}
          onValueChange={(v) => {
            setFilterRole(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate rolurile</SelectItem>
            <SelectItem value="specialist_doctor">Specialist</SelectItem>
            <SelectItem value="lab_doctor">Medic laborator</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterDept}
          onValueChange={(v) => {
            setFilterDept(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate departamentele</SelectItem>
            {allDepartments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Doctors Grid */}
      {paginatedDoctors.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Niciun medic găsit</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "Încearcă un alt termen de căutare sau elimină filtrele."
                : "Adaugă primul medic pentru a începe."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => onNavigate("add-doctor")} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Adaugă medic
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
              onClick={() => onNavigate(`doctor-schedule-${doctor.id}`)}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback
                      className={`font-semibold text-sm ${avatarColor(doctor.doctorRole)}`}
                    >
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onNavigate(`edit-doctor-${doctor.id}`)}>
                      <Edit className="w-4 h-4 mr-2" /> Editează medic
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNavigate(`doctor-schedule-${doctor.id}`)}>
                      <CalendarDays className="w-4 h-4 mr-2" /> Vezi detalii
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(doctor)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Șterge medic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doctor.department}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doctor.licenseNumber}</span>
                </div>
              </div>

              {/* Footer: role badge */}
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
                  onClick={(e) => { e.stopPropagation(); onNavigate(`edit-doctor-${doctor.id}`); }}
                >
                  Editează
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Afișând {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredDoctors.length)} din{" "}
            {filteredDoctors.length} {filteredDoctors.length !== 1 ? "medici" : "medic"}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ștergeți medicul?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Această acțiune va elimina permanent{" "}
            <strong>{deleteConfirm?.name}</strong> din sistem. Acțiunea nu poate
            fi anulată.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Șterge medic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
