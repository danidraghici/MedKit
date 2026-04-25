import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FlaskConical, Clock, User, FileText, Upload, X, CheckCircle2, Loader2, Dot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useAppStore } from "@/lib/store";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import type { LabRequest } from "@/lib/types";

// ─── Result submission form ───────────────────────────────────────────────────

const resultSchema = z
  .object({
    observations: z.string().optional(),
    file: z.instanceof(File).optional(),
  })
  .refine((d) => (d.observations?.trim() ?? "") !== "" || d.file !== undefined, {
    message: "Provide observations, a file, or both.",
    path: ["observations"],
  });

type ResultFormData = z.infer<typeof resultSchema>;

// ─── Status badge helper ──────────────────────────────────────────────────────

function statusBadge(status: string) {
  const base = "text-xs px-2.5 py-1 rounded-full font-semibold border";
  if (status === "Pending")
    return `${base} text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800`;
  if (status === "In Progress")
    return `${base} text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800`;
  return `${base} text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterTab = "All" | "Pending" | "In Progress" | "Completed";

export default function LabRequestsPage() {
  const labRequests = useAppStore((s) => s.labRequests);
  const fetchLabRequests = useAppStore((s) => s.fetchLabRequests);
  const updateLabRequestStatus = useAppStore((s) => s.updateLabRequestStatus);
  const markLabRequestRead = useAppStore((s) => s.markLabRequestRead);
  const submitLabResult = useAppStore((s) => s.submitLabResult);
  const fetchUnreadLabRequestCount = useAppStore((s) => s.fetchUnreadLabRequestCount);

  const [filter, setFilter] = useState<FilterTab>("All");
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(labRequests.length === 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<ResultFormData>({ resolver: zodResolver(resultSchema) });

  // Refresh in the background; only show spinner on first load (empty store)
  useEffect(() => {
    void fetchLabRequests().finally(() => setIsLoading(false));
  }, [fetchLabRequests]);

  // 30-second unread badge polling
  useEffect(() => {
    const id = setInterval(() => void fetchUnreadLabRequestCount(), 30_000);
    return () => clearInterval(id);
  }, [fetchUnreadLabRequestCount]);

  const filtered = labRequests.filter((r) => filter === "All" || r.status === filter);

  const openRequest = async (req: LabRequest) => {
    setSelectedRequest(req);
    setIsSheetOpen(true);
    resetForm();
    setSelectedFile(null);
    if (!req.viewedByLabAt) {
      await markLabRequestRead(req.id);
    }
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedRequest(null);
    resetForm();
    setSelectedFile(null);
  };

  const handleStartProcessing = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await updateLabRequestStatus(selectedRequest.id, "In Progress");
      setSelectedRequest((prev) => prev ? { ...prev, status: "In Progress" } : prev);
      toast.success("Status updated to In Progress");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmitResult = async (data: ResultFormData) => {
    if (!selectedRequest) return;
    try {
      await submitLabResult(
        selectedRequest.id,
        data.observations?.trim() || undefined,
        selectedFile ?? undefined,
      );
      toast.success("Results submitted. Lab request marked as Completed.");
      closeSheet();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit results.");
    }
  };

  // Keep sheet in sync with store updates (e.g. after status change)
  const liveRequest = selectedRequest
    ? (labRequests.find((r) => r.id === selectedRequest.id) ?? selectedRequest)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lab Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and process incoming lab sample requests.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["All", "Pending", "In Progress", "Completed"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab !== "All" && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({labRequests.filter((r) => r.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading lab requests…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <EmptyTitle>No requests</EmptyTitle>
            <EmptyDescription>
              {filter === "All"
                ? "No pending or in-progress lab requests at the moment."
                : `No requests with status "${filter}".`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <button
              key={req.id}
              onClick={() => void openRequest(req)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {!req.viewedByLabAt && (
                      <Dot className="w-5 h-5 text-primary shrink-0 -ml-1.5" />
                    )}
                    <span className="font-semibold text-sm truncate">{req.patientName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {req.sampleTypes.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {s === "csf" ? "CSF" : s}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(req.createdAt)}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.requestedByDoctorName}</span>
                  </p>
                </div>
                <span className={statusBadge(req.status)}>{req.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {liveRequest && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />Lab Request
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {/* Meta */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Patient</span>
                    <span className="font-medium">{liveRequest.patientName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Requested by</span>
                    <span className="font-medium">{liveRequest.requestedByDoctorName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{formatDate(liveRequest.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={statusBadge(liveRequest.status)}>{liveRequest.status}</span>
                  </div>
                </div>

                {/* Sample types */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {liveRequest.sampleTypes.map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border capitalize font-medium">
                        {s === "csf" ? "CSF" : s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specialist notes */}
                {liveRequest.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />Specialist notes
                    </p>
                    <p className="text-sm bg-muted/50 rounded-lg border border-border px-3 py-2">
                      {liveRequest.notes}
                    </p>
                  </div>
                )}

                {/* Actions by status */}
                {liveRequest.status === "Pending" && (
                  <Button
                    onClick={() => void handleStartProcessing()}
                    disabled={isProcessing}
                    className="w-full gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                    Start Processing
                  </Button>
                )}

                {liveRequest.status === "In Progress" && (
                  <form onSubmit={handleSubmit(onSubmitResult)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Observations</Label>
                      <Textarea
                        {...register("observations")}
                        placeholder="Enter findings, measurements, or observations…"
                        rows={4}
                        className="resize-none"
                      />
                      {errors.observations && (
                        <p className="text-xs text-destructive">{errors.observations.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Attach file (PDF / JPEG / PNG, max 10 MB)</Label>
                      {selectedFile ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm border border-border">
                          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setValue("file", undefined);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex flex-col items-center gap-1.5 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors text-muted-foreground hover:text-primary text-sm"
                        >
                          <Upload className="w-5 h-5" />
                          Click to upload result file
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setSelectedFile(f);
                            setValue("file", f);
                          }
                        }}
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Submit Results
                    </Button>
                  </form>
                )}

                {/* Completed: read-only results */}
                {liveRequest.status === "Completed" && liveRequest.results.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted results</p>
                    {liveRequest.results.map((res) => (
                      <div key={res.id} className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        {res.observations && <p className="text-sm">{res.observations}</p>}
                        {res.labResultFileName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />{res.labResultFileName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted by {res.submitterName} · {formatDateTime(res.submittedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
