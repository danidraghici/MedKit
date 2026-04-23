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

interface PatientsPageProps {
  onNavigate: (page: string) => void;
}

export default function PatientsPage({ onNavigate }: PatientsPageProps) {
  const patients = useAppStore((s) => s.patients);
  const deletePatient = useAppStore((s) => s.deletePatient);
  const user = useAppStore((s) => s.user);
  const fetchPatients = useAppStore((s) => s.fetchPatients);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchPatients();
    }
  }, [user?.role, fetchPatients]);

  // Lab doctors cannot add/edit/delete patients
  const canManagePatients = user?.role === "admin" || user?.role === "specialist_doctor";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSex, setFilterSex] = useState<string>("all");
  const [filterBloodType, setFilterBloodType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null);

  const filteredPatients = useMemo(() => {
    let filtered = patients;
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
  }, [patients, searchQuery, filterSex, filterBloodType]);

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
            {patients.length} pacienti inrecistrati
          </p>
        </div>
        {canManagePatients && (
          <Button onClick={() => onNavigate("add-patient")} className="gap-2 sm:w-auto w-full">
            <UserPlus className="w-4 h-4" />
            Adauga Pacient
          </Button>
        )}
      </div>

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
                  <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                  <Badge
                    variant="solid"
                    accent={(bloodTypeColors[patient.bloodType] as any) || "default"}
                    className="text-xs px-1.5 py-0"
                  >
                    {patient.bloodType}
                  </Badge>
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
