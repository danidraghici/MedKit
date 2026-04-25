import { useState, useMemo, useEffect } from "react";
import {
  Search,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Droplets,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { useAppStore } from "@/lib/store";
import { formatDate, calculateAge, getInitials } from "@/lib/utils";
import type { Patient } from "@/lib/types";

const PAGE_SIZE = 8;

function labStatusBadge(status: "Pending" | "In Progress" | "Completed") {
  const base = "text-xs px-2 py-0.5 rounded-full font-semibold border";
  if (status === "Pending")
    return `${base} text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800`;
  if (status === "In Progress")
    return `${base} text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800`;
  return `${base} text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800`;
}

interface PatientsPageProps {
  onNavigate: (page: string) => void;
}

export default function PatientsPage({ onNavigate }: PatientsPageProps) {
  const patients = useAppStore((s) => s.patients);
  const deletePatient = useAppStore((s) => s.deletePatient);
  const user = useAppStore((s) => s.user);
  const fetchPatients = useAppStore((s) => s.fetchPatients);
  const labRequests = useAppStore((s) => s.labRequests);
  const fetchLabRequests = useAppStore((s) => s.fetchLabRequests);

  const isLabDoctor = user?.role === "lab_doctor";

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "specialist_doctor" || user?.role === "lab_doctor") {
      void fetchPatients();
      if (user?.role === "lab_doctor") void fetchLabRequests();
    }
  }, [user?.role, fetchPatients, fetchLabRequests]);

  // Lab doctors cannot add/edit/delete patients
  const canManagePatients = user?.role === "admin" || user?.role === "specialist_doctor";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSex, setFilterSex] = useState<string>("all");
  const [filterBloodType, setFilterBloodType] = useState<string>("all");
  const [labStatusFilter, setLabStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Completed">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null);

  const pid = (id: string) => id.toLowerCase();

  // For lab doctors: map patientId (normalised) → most-urgent lab request status
  const labStatusByPatient = useMemo(() => {
    const priority: Record<string, number> = { Pending: 0, "In Progress": 1, Completed: 2 };
    const map = new Map<string, "Pending" | "In Progress" | "Completed">();
    for (const r of labRequests) {
      const key = pid(r.patientId);
      const cur = map.get(key);
      if (!cur || priority[r.status] < priority[cur]) map.set(key, r.status);
    }
    return map;
  }, [labRequests]);

  const filteredPatients = useMemo(() => {
    let filtered = patients;

    if (isLabDoctor) {
      const labPatientIds = new Set(labRequests.map((r) => pid(r.patientId)));
      filtered = filtered.filter((p) => labPatientIds.has(pid(p.id)));
      if (labStatusFilter !== "All") {
        filtered = filtered.filter((p) =>
          labRequests.some((r) => pid(r.patientId) === pid(p.id) && r.status === labStatusFilter)
        );
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.nationalId.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
    }
    if (filterSex !== "all") {
      filtered = filtered.filter((p) => p.sex === filterSex);
    }
    if (filterBloodType !== "all") {
      filtered = filtered.filter((p) => p.bloodType === filterBloodType);
    }
    return filtered;
  }, [patients, searchQuery, filterSex, filterBloodType, isLabDoctor, labRequests, labStatusFilter]);

  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDelete = (patient: Patient) => {
    deletePatient(patient.id);
    setDeleteConfirm(null);
  };

  const bloodTypeColors: Record<string, string> = {
    "A+": "info", "A-": "cerulean", "B+": "teal", "B-": "eagle",
    "AB+": "purple", "AB-": "violet", "O+": "orange", "O-": "brick", "Nespecificat": "default",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacienti</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLabDoctor
              ? `${new Set(labRequests.map((r) => pid(r.patientId))).size} pacienti cu analize`
              : `${patients.length} pacienti inrecistrati`}
          </p>
        </div>
        {canManagePatients && (
          <Button onClick={() => onNavigate("add-patient")} className="gap-2 sm:w-auto w-full">
            <UserPlus className="w-4 h-4" />
            Adauga Pacient
          </Button>
        )}
      </div>

      {/* Lab status filter tabs — lab doctors only */}
      {isLabDoctor && (
        <div className="flex gap-1 border-b border-border">
          {(["All", "Pending", "In Progress", "Completed"] as const).map((tab) => {
            const count = tab === "All"
              ? new Set(labRequests.map((r) => pid(r.patientId))).size
              : new Set(labRequests.filter((r) => r.status === tab).map((r) => pid(r.patientId))).size;
            return (
              <button
                key={tab}
                onClick={() => { setLabStatusFilter(tab); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  labStatusFilter === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa CNP, nume, email, telefon..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterSex} onValueChange={(v) => { setFilterSex(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="Male">Masculin</SelectItem>
            <SelectItem value="Female">Feminin</SelectItem>
            <SelectItem value="Other">Altul</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBloodType} onValueChange={(v) => { setFilterBloodType(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Grupa Sanguina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Nespecificat"].map((bt) => (
              <SelectItem key={bt} value={bt}>{bt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Patients Grid */}
      {paginatedPatients.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Niciun pacient gasit</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "Try a different search term or clear filters."
                : canManagePatients
                ? "Add your first patient to get started."
                : "No patients registered yet."}
            </EmptyDescription>
          </EmptyHeader>
          {canManagePatients && (
            <EmptyContent>
              <Button onClick={() => onNavigate("add-patient")} className="gap-2"><UserPlus className="w-4 h-4" />Add Patient</Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {calculateAge(patient.dateOfBirth)} yrs · {patient.sex}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onNavigate(`patient-${patient.id}`)}>
                      <Eye className="w-4 h-4 mr-2" /> View details
                    </DropdownMenuItem>
                    {canManagePatients && (
                      <>
                        <DropdownMenuItem onClick={() => onNavigate(`edit-patient-${patient.id}`)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit patient
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirm(patient)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete patient
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Info */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{patient.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDate(patient.dateOfBirth)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border">
                <div className="flex items-center gap-1.5">
                  {isLabDoctor ? (
                    <>
                      <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                      {labStatusByPatient.get(pid(patient.id)) && (
                        <span className={labStatusBadge(labStatusByPatient.get(pid(patient.id))!)}>
                          {labStatusByPatient.get(pid(patient.id))}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                      <Badge
                        variant="solid"
                        accent={(bloodTypeColors[patient.bloodType] as any) || "default"}
                        className="text-xs px-1.5 py-0"
                      >
                        {patient.bloodType}
                      </Badge>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onNavigate(`patient-${patient.id}`)}
                >
                  View record
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
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} of {filteredPatients.length} patients
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

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete patient record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete <strong>{deleteConfirm?.fullName}</strong>'s record and all associated data.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
