import { useState, useEffect } from "react";
import { ClipboardList, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuditLogs } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

const ACTION_COLORS: Record<string, string> = {
  INSERT: "border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  UPDATE: "border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
  DELETE: "border-red-300 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  LOGIN:  "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  LOGOUT: "border-slate-300 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function JsonRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  let pretty = value;
  try { pretty = JSON.stringify(JSON.parse(value), null, 2); } catch { /* use raw */ }
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">{pretty}</pre>
    </div>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(log.oldValues || log.newValues || log.metadata);
  const actionColor = ACTION_COLORS[log.action] ?? "border-border text-muted-foreground";

  return (
    <>
      <tr
        className={`border-b border-border text-sm transition-colors ${hasDetails ? "cursor-pointer hover:bg-muted/40" : ""}`}
        onClick={() => hasDetails && setExpanded((e) => !e)}
      >
        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(log.performedAt)}
        </td>
        <td className="px-3 py-2.5">
          <Badge variant="outline" className={`text-[11px] font-semibold ${actionColor}`}>
            {log.action}
          </Badge>
        </td>
        <td className="px-3 py-2.5 font-mono text-xs">{log.entityType}</td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[160px]">
          {log.performedByName ?? <span className="italic">system</span>}
        </td>
        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground truncate max-w-[140px]">
          {log.entityId ?? "—"}
        </td>
        <td className="px-3 py-2.5 text-center">
          {hasDetails
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground inline" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground inline" />
            : null}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-3 space-y-2">
            <JsonRow label="Old values" value={log.oldValues} />
            <JsonRow label="New values" value={log.newValues} />
            <JsonRow label="Metadata" value={log.metadata} />
            {log.ipAddress && (
              <p className="text-xs text-muted-foreground">IP: <span className="font-mono">{log.ipAddress}</span></p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    getAuditLogs(500)
      .then(setLogs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const actions = ["all", ...Array.from(new Set(logs.map((l) => l.action))).sort()];
  const filtered = filterAction === "all" ? logs : logs.filter((l) => l.action === filterAction);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable record of every admin action. Entries cannot be edited or deleted.
          </p>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">When</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Action</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Entity</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Performed by</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Entity ID</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        No audit log entries found.
                      </td>
                    </tr>
                  )
                : filtered.map((log) => <AuditRow key={log.id} log={log} />)
              }
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Showing {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {filterAction !== "all" ? ` · filtered by ${filterAction}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
