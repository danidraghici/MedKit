import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  CalendarCheck,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { KPI } from "@/components/ui/kpi";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

interface AppointmentsPageProps {
  onNavigate: (page: string) => void;
}

interface AppointmentStats {
  totalNext30Days: number;
  completedLast30Days: number;
  today: number;
  nextWeek: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  Scheduled: {
    label: "Programat",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    className: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  },
  Completed: {
    label: "Finalizat",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  },
  Cancelled: {
    label: "Anulat",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "text-muted-foreground bg-muted border-border",
  },
};

export default function AppointmentsPage({ onNavigate }: AppointmentsPageProps) {
  const user = useAppStore((s) => s.user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStats, fetchedAppointments] = await Promise.all([
        api.get<AppointmentStats>("/api/appointments/stats"),
        api.get<Appointment[]>("/api/appointments"),
      ]);
      setStats(fetchedStats);
      setAppointments(fetchedAppointments);
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleStatusChange = async (id: string, status: "Finalizată" | "Anulată") => {
    try {
      await api.patch(`/api/appointments/${id}/status`, { status });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      // Refresh stats after status change
      const updatedStats = await api.get<AppointmentStats>("/api/appointments/stats");
      setStats(updatedStats);
    } catch (err) {
      console.error("Failed to update appointment status", err);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let list = [...appointments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.doctor.toLowerCase().includes(q),
      );
    }

    if (filterStatus !== "all") {
      list = list.filter((a) => a.status === filterStatus);
    }

    if (filterPeriod === "today") {
      list = list.filter((a) => {
        const d = new Date(a.date);
        return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      });
    } else if (filterPeriod === "upcoming") {
      list = list.filter((a) => new Date(a.date) >= today);
    } else if (filterPeriod === "past") {
      list = list.filter((a) => new Date(a.date) < today);
    }

    // Sort: upcoming first, then past descending
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      const nowTs = now.getTime();
      if (da >= nowTs && db >= nowTs) return da - db;
      if (da < nowTs && db < nowTs) return db - da;
      return da >= nowTs ? -1 : 1;
    });

    return list;
  }, [appointments, searchQuery, filterStatus, filterPeriod]);

  // ── Group by date ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filtered.forEach((a) => {
      const key = a.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Se încarcă programările…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programări</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats?.nextWeek ?? 0} programări în această săptămână · {stats?.today ?? 0} astăzi
          </p>
        </div>
        <Button onClick={() => onNavigate("create-appointment")} className="gap-2 sm:w-auto w-full">
          <Plus className="w-4 h-4" />
          Programează consultație
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI
          label="Următoarele 30 zile"
          value={stats?.totalNext30Days ?? 0}
          period="Viitoare"
          icon={<CalendarDays className="w-7 h-7" />}
          accent="cerulean"
        />
        <KPI
          label="Finalizate (30z)"
          value={stats?.completedLast30Days ?? 0}
          period="Ultimele 30 zile"
          icon={<CalendarCheck className="w-7 h-7" />}
          accent="teal"
        />
        <KPI
          label="Astăzi"
          value={stats?.today ?? 0}
          period="Programate"
          icon={<Clock className="w-7 h-7" />}
          accent="purple"
        />
        <KPI
          label="Această săptămână"
          value={stats?.nextWeek ?? 0}
          period="Următoarele 7 zile"
          icon={<Filter className="w-7 h-7" />}
          accent="orange"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Caută pacient, tip, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            <SelectItem value="Scheduled">Programat</SelectItem>
            <SelectItem value="Completed">Finalizat</SelectItem>
            <SelectItem value="Cancelled">Anulat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Oricând</SelectItem>
            <SelectItem value="today">Astăzi</SelectItem>
            <SelectItem value="upcoming">Viitoare</SelectItem>
            <SelectItem value="past">Trecute</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nicio programare găsită</EmptyTitle>
            <EmptyDescription>
              {searchQuery || filterStatus !== "all" || filterPeriod !== "all"
                ? "Încercați să ștergeți filtrele."
                : "Programați prima consultație pentru a începe."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => onNavigate("create-appointment")} className="gap-2">
              <Plus className="w-4 h-4" />
              Programează consultație
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, apts]) => {
            const d = new Date(date);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isToday = d.toDateString() === today.toDateString();
            const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString();

            const dayLabel = isToday ? "Astăzi" : isTomorrow ? "Mâine" : formatDate(date, "EEEE, dd MMMM yyyy");

            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">{formatDate(date, "dd")}</span>
                    <span className="text-[10px] leading-none uppercase opacity-80">{formatDate(date, "MMM")}</span>
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isToday ? "text-primary" : ""}`}>{dayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {apts.length} programare{apts.length !== 1 ? "i" : ""}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-2.5">
                  {apts.map((apt) => {
                    const sc = statusConfig[apt.status] ?? {
                      label: apt.status || "Necunoscut",
                      icon: <AlertCircle className="w-3.5 h-3.5" />,
                      className: "text-muted-foreground bg-muted border-border",
                    };
                    return (
                      <Card key={apt.id} className="hover:shadow-sm transition-shadow group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Time block */}
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-muted/60 shrink-0">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground mb-0.5" />
                              <span className="text-sm font-bold">{apt.time}</span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => onNavigate(`patient-${apt.patientId}`)}
                                  className="flex items-center gap-2 group/btn"
                                >
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                      {getInitials(apt.patientName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-sm group-hover/btn:text-primary transition-colors">
                                    {apt.patientName}
                                  </span>
                                </button>
                                <span
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.className}`}
                                >
                                  {sc.icon}
                                  {sc.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">{apt.type}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{apt.doctor}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onNavigate(`patient-${apt.patientId}`)}>
                                  <User className="w-4 h-4 mr-2" />
                                  Vezi fișa pacientului
                                </DropdownMenuItem>
                                {apt.status === "Planificată" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => void handleStatusChange(apt.id, "Finalizată")}>
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                      Marchează finalizat
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => void handleStatusChange(apt.id, "Anulată")}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Marchează anulat
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {apt.status === "Anulată" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onNavigate("create-appointment")}>
                                      <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                                      Reprogramează
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
