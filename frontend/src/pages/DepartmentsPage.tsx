import { useState, useEffect } from "react";
import { Plus, Edit, Building2, FileText, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Department } from "@/lib/types";

const deptSchema = z.object({
  name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
  description: z.string().optional(),
});
type DeptFormData = z.infer<typeof deptSchema>;

interface DepartmentsPageProps {
  onNavigate: (page: string) => void;
}

export default function DepartmentsPage({ onNavigate }: DepartmentsPageProps) {
  const departments = useAppStore((s) => s.departments);
  const fetchDepartments = useAppStore((s) => s.fetchDepartments);
  const addDepartmentLocal = useAppStore((s) => s.addDepartmentLocal);
  const updateDepartmentLocal = useAppStore((s) => s.updateDepartmentLocal);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeptFormData>({ resolver: zodResolver(deptSchema) });

  const openAdd = () => {
    setEditingDept(null);
    reset({ name: "", description: "" });
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    reset({ name: dept.name, description: dept.description });
    setServerError(null);
    setDialogOpen(true);
  };

  const onSubmit = async (data: DeptFormData) => {
    setServerError(null);
    try {
      if (editingDept) {
        const updated = await api.put<Department>(
          `/api/departments/${editingDept.id}`,
          data
        );
        updateDepartmentLocal(editingDept.id, updated);
      } else {
        const created = await api.post<Department>("/api/departments", data);
        addDepartmentLocal(created);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      if (apiErr.status === 409) {
        setError("name", {
          message: "Un departament cu acest nume există deja.",
        });
      } else {
        setServerError("Salvarea departamentului a eșuat. Încercați din nou.");
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departamente</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {departments.length} {departments.length !== 1 ? "departamente" : "departament"}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 sm:w-auto w-full">
          <Plus className="w-4 h-4" />
          Adaugă departament
        </Button>
      </div>

      {/* Card grid */}
      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">Niciun departament încă</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Adaugă primul departament pentru a începe.
          </p>
          <Button onClick={openAdd} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Adaugă departament
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer"
              onClick={() => onNavigate(`department-${dept.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm leading-tight">{dept.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); openEdit(dept); }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              {dept.description && (
                <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{dept.description}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); openEdit(dept); }}
                >
                  Editează
                </Button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  Vezi medici <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Editează departament" : "Adaugă departament"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">
                Nume <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dept-name"
                placeholder="ex. Cardiologie"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Descriere</Label>
              <Textarea
                id="dept-desc"
                placeholder="Scurtă descriere a funcției acestui departament..."
                rows={3}
                {...register("description")}
              />
            </div>

            {serverError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Se salvează..."
                  : editingDept
                  ? "Salvează modificările"
                  : "Adaugă departament"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
