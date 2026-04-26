import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Plus, Edit3, Trash2, CheckCircle2, XCircle, CalendarX, Clock, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import type { DoctorScheduleEntry, CreateScheduleEntryPayload } from "@/lib/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Zod schema ──────────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  scheduleType: z.enum(["working_hours", "block"]),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format").optional().or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format").optional().or(z.literal("")),
  isWorkingDay: z.boolean(),
  isFullDay: z.boolean(),
  reason: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.scheduleType === "working_hours") {
    if (data.dayOfWeek === undefined || data.dayOfWeek === null) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "Select a day" });
    }
    if (data.isWorkingDay && !data.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Start time is required" });
    }
  }
  if (data.scheduleType === "block" && !data.specificDate) {
    ctx.addIssue({ code: "custom", path: ["specificDate"], message: "Select a date" });
  }
});

type FormValues = z.infer<typeof scheduleSchema>;

// ─── Helper to build payload ─────────────────────────────────────────────────

function toPayload(v: FormValues): CreateScheduleEntryPayload {
  return {
    scheduleType: v.scheduleType,
    dayOfWeek: v.scheduleType === "working_hours" ? v.dayOfWeek : undefined,
    specificDate: v.scheduleType === "block" ? v.specificDate : undefined,
    startTime: v.startTime || undefined,
    endTime: v.endTime || undefined,
    isWorkingDay: v.scheduleType === "working_hours" ? v.isWorkingDay : false,
    isFullDay: v.scheduleType === "block" ? v.isFullDay : false,
    reason: v.reason || undefined,
  };
}

// ─── Time display helper ──────────────────────────────────────────────────────

function formatTimeRange(entry: DoctorScheduleEntry): string {
  if (entry.isFullDay) return "Full day";
  if (!entry.startTime) return "—";
  return entry.endTime ? `${entry.startTime} – ${entry.endTime}` : `From ${entry.startTime}`;
}

// ─── Entry Dialog ─────────────────────────────────────────────────────────────

interface EntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateScheduleEntryPayload) => Promise<void>;
  defaultType?: "working_hours" | "block";
  editing?: DoctorScheduleEntry | null;
  submitting: boolean;
  readonlyType?: boolean;
  title?: string;
}

function EntryDialog({ open, onClose, onSubmit, defaultType = "working_hours", editing, submitting, readonlyType, title }: EntryDialogProps) {
  const {
    register, handleSubmit, watch, setValue, control, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduleType: editing?.scheduleType ?? defaultType,
      dayOfWeek: editing?.dayOfWeek,
      specificDate: editing?.specificDate,
      startTime: editing?.startTime ?? "",
      endTime: editing?.endTime ?? "",
      isWorkingDay: editing?.isWorkingDay ?? true,
      isFullDay: editing?.isFullDay ?? false,
      reason: editing?.reason ?? "",
    },
  });

  const scheduleType = watch("scheduleType");
  const isWorkingDay = watch("isWorkingDay");
  const isFullDay = watch("isFullDay");
  const specificDate = watch("specificDate");

  useEffect(() => {
    if (open) {
      reset({
        scheduleType: editing?.scheduleType ?? defaultType,
        dayOfWeek: editing?.dayOfWeek,
        specificDate: editing?.specificDate,
        startTime: editing?.startTime ?? "",
        endTime: editing?.endTime ?? "",
        isWorkingDay: editing?.isWorkingDay ?? true,
        isFullDay: editing?.isFullDay ?? false,
        reason: editing?.reason ?? "",
      });
    }
  }, [open, editing, defaultType, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(toPayload(values));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? (editing ? "Edit Entry" : "Add Entry")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Schedule Type */}
          {!readonlyType && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                name="scheduleType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="working_hours">Working hours</SelectItem>
                      <SelectItem value="block">Block / unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Working Hours fields */}
          {scheduleType === "working_hours" && (
            <>
              <div className="space-y-1.5">
                <Label>Day of week</Label>
                <Controller
                  name="dayOfWeek"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day…" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, i) => (
                          <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.dayOfWeek && (
                  <p className="text-xs text-destructive">{errors.dayOfWeek.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Controller
                  name="isWorkingDay"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="isWorkingDay" />
                  )}
                />
                <Label htmlFor="isWorkingDay">Working day</Label>
              </div>

              {isWorkingDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start time</Label>
                    <Input type="time" {...register("startTime")} />
                    {errors.startTime && (
                      <p className="text-xs text-destructive">{errors.startTime.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>End time</Label>
                    <Input type="time" {...register("endTime")} />
                    {errors.endTime && (
                      <p className="text-xs text-destructive">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Block fields */}
          {scheduleType === "block" && (
            <>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      {specificDate
                        ? format(parseISO(specificDate), "PPP")
                        : <span className="text-muted-foreground">Pick a date…</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={specificDate ? parseISO(specificDate) : undefined}
                      onSelect={(d) => setValue("specificDate", d ? format(d, "yyyy-MM-dd") : "")}
                    />
                  </PopoverContent>
                </Popover>
                {errors.specificDate && (
                  <p className="text-xs text-destructive">{errors.specificDate.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Controller
                  name="isFullDay"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="isFullDay" />
                  )}
                />
                <Label htmlFor="isFullDay">Full day</Label>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start time</Label>
                    <Input type="time" {...register("startTime")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End time</Label>
                    <Input type="time" {...register("endTime")} />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Reason (optional)</Label>
                <Textarea rows={2} placeholder="e.g. Vacation, Conference…" {...register("reason")} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  doctorId: string;
  readOnly?: boolean;
  adminMode?: boolean;
}

export function DoctorScheduleTab({ doctorId, readOnly = false, adminMode = false }: Props) {
  const {
    fetchDoctorSchedule, fetchPendingScheduleEntries,
    createScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
    approveScheduleEntry, rejectScheduleEntry,
    schedulePendingCount, fetchSchedulePendingCount,
  } = useAppStore();

  const [activeEntries, setActiveEntries] = useState<DoctorScheduleEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<DoctorScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"working_hours" | "block">("working_hours");
  const [editingEntry, setEditingEntry] = useState<DoctorScheduleEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DoctorScheduleEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [active, pending] = await Promise.all([
        fetchDoctorSchedule(doctorId),
        readOnly || adminMode ? Promise.resolve([]) : fetchPendingScheduleEntries(doctorId),
      ]);
      setActiveEntries(active);
      setPendingEntries(pending);
    } catch {
      toast.error("Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  }, [doctorId, fetchDoctorSchedule, fetchPendingScheduleEntries, readOnly, adminMode]);

  useEffect(() => { void load(); }, [load]);

  const workingHours = activeEntries
    .filter((e) => e.scheduleType === "working_hours")
    .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0));

  const blocks = activeEntries
    .filter((e) => e.scheduleType === "block")
    .sort((a, b) => (a.specificDate ?? "").localeCompare(b.specificDate ?? ""));

  // ── Dialog open helpers ───────────────────────────────────────────────────

  const openAdd = (type: "working_hours" | "block") => {
    setEditingEntry(null);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openEdit = (entry: DoctorScheduleEntry) => {
    setEditingEntry(entry);
    setDialogType(entry.scheduleType);
    setDialogOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (payload: CreateScheduleEntryPayload) => {
    setSubmitting(true);
    try {
      if (editingEntry) {
        const updated = await updateScheduleEntry(doctorId, editingEntry.id, payload);
        if (adminMode) {
          // Admin update creates a pending entry — it won't appear in active list immediately
          toast.success("Proposed change submitted. Waiting for doctor approval.");
        } else {
          setActiveEntries((prev) => prev.map((e) => e.id === editingEntry.id ? updated : e));
          toast.success("Schedule updated.");
        }
      } else {
        const created = await createScheduleEntry(doctorId, payload);
        if (adminMode) {
          toast.success("Proposed entry submitted. Waiting for doctor approval.");
        } else {
          setActiveEntries((prev) => [...prev, created]);
          toast.success("Schedule entry added.");
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteScheduleEntry(doctorId, deleteTarget.id);
      setActiveEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success("Entry removed.");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete entry.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Approve ───────────────────────────────────────────────────────────────

  const handleApprove = async (entry: DoctorScheduleEntry) => {
    try {
      const approved = await approveScheduleEntry(doctorId, entry.id);
      setPendingEntries((prev) => prev.filter((e) => e.id !== entry.id));
      // If it replaced an existing entry, update active list
      if (entry.replacesScheduleId) {
        setActiveEntries((prev) => prev.map((e) => e.id === entry.replacesScheduleId ? approved : e));
      } else {
        setActiveEntries((prev) => [...prev, approved]);
      }
      fetchSchedulePendingCount(doctorId);
      toast.success("Schedule change approved.");
    } catch {
      toast.error("Failed to approve change.");
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────

  const handleReject = async (entry: DoctorScheduleEntry) => {
    try {
      await rejectScheduleEntry(doctorId, entry.id);
      setPendingEntries((prev) => prev.filter((e) => e.id !== entry.id));
      fetchSchedulePendingCount(doctorId);
      toast.success("Change rejected.");
    } catch {
      toast.error("Failed to reject change.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading schedule…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Changes (doctor-facing only) */}
      {!readOnly && !adminMode && pendingEntries.length > 0 && (
        <div className="space-y-3">
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              {pendingEntries.length === 1
                ? "1 schedule change proposed by an admin requires your review."
                : `${pendingEntries.length} schedule changes proposed by an admin require your review.`}
            </AlertDescription>
          </Alert>

          {pendingEntries.map((entry) => (
            <Card key={entry.id} className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {entry.scheduleType === "working_hours"
                        ? `Working hours — ${DAY_NAMES[entry.dayOfWeek ?? 0]}`
                        : `Block — ${entry.specificDate ? format(parseISO(entry.specificDate), "PPP") : "—"}`}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.scheduleType === "working_hours"
                        ? entry.isWorkingDay
                          ? `${formatTimeRange(entry)}`
                          : "Mark as day off"
                        : formatTimeRange(entry)}
                    </p>
                    {entry.reason && (
                      <p className="text-muted-foreground italic">Reason: {entry.reason}</p>
                    )}
                    {entry.proposedByName && (
                      <p className="text-xs text-muted-foreground">Proposed by {entry.proposedByName}</p>
                    )}
                    {entry.replacesScheduleId && (
                      <Badge variant="outline" className="text-xs">Replaces existing entry</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-400 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                      onClick={() => void handleApprove(entry)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => void handleReject(entry)}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Separator />
        </div>
      )}

      {/* Working Hours */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Working Hours
            </CardTitle>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => openAdd("working_hours")}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {workingHours.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No working hours set.</p>
          ) : (
            <div className="space-y-2">
              {DAY_NAMES.map((_, dayIndex) => {
                const entries = workingHours.filter((e) => e.dayOfWeek === dayIndex);
                if (entries.length === 0) return null;
                return entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-10 font-medium text-muted-foreground">{DAY_SHORT[dayIndex]}</span>
                      {entry.isWorkingDay ? (
                        <span>{formatTimeRange(entry)}</span>
                      ) : (
                        <Badge variant="secondary">Day Off</Badge>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => !adminMode && setDeleteTarget(entry)}
                          disabled={adminMode}
                          title={adminMode ? "Admins cannot delete entries directly" : undefined}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ));
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarX className="w-4 h-4" /> Blocked Dates
            </CardTitle>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => openAdd("block")}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No blocked dates.</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">
                      {entry.specificDate ? format(parseISO(entry.specificDate), "PPP") : "—"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatTimeRange(entry)}
                      {entry.reason && ` · ${entry.reason}`}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => !adminMode && setDeleteTarget(entry)}
                        disabled={adminMode}
                        title={adminMode ? "Admins cannot delete entries directly" : undefined}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <EntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        defaultType={dialogType}
        editing={editingEntry}
        submitting={submitting}
        readonlyType={!!editingEntry}
        title={
          adminMode
            ? editingEntry ? "Propose Change" : "Propose New Entry"
            : editingEntry ? "Edit Entry" : "Add Entry"
        }
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This schedule entry will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
