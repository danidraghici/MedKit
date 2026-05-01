import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ShieldCheck,
  LogOut,
  User,
  UserCircle,
  Heart,
  Calendar,
  FlaskConical,
  FileText,
  Bell,
  Stethoscope,
  UserCog,
  Building2,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { PrimaryTemplate } from "@/components/blocks/primary-template";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import LoginPage from "@/pages/LoginPage";
import PatientLoginPage from "@/pages/PatientLoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import CreateAppointmentPage from "@/pages/CreateAppointmentPage";
import ChatbotPage from "@/pages/ChatbotPage";
import DoctorProfilePage from "@/pages/DoctorProfilePage";
import DoctorsPage from "@/pages/DoctorsPage";
import AddPatientPage from "@/pages/AddPatientPage";
import AddDoctorPage from "@/pages/AddDoctorPage";
import PatientDashboardPage from "@/pages/PatientDashboardPage";
import ForceChangePasswordPage from "@/pages/ForceChangePasswordPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import DepartmentDoctorsPage from "@/pages/DepartmentDoctorsPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import LabRequestsPage from "@/pages/LabRequestsPage";
import AdminDoctorSchedulePage from "@/pages/AdminDoctorSchedulePage";

type PageId = string;
type LoginMode = "doctor" | "patient";

// ── Navigation by role ────────────────────────────────────────────────────────
const specialistNavigation = [
  { id: "dashboard", label: "Tablou de bord", icon: LayoutDashboard },
  { id: "patients", label: "Pacienți", icon: Users },
  { id: "appointments", label: "Programări", icon: Calendar },
  // { id: "chatbot", label: "AI Calculi Renali", icon: MessageSquare },
  { id: "profile", label: "Profilul meu", icon: UserCircle },
];

const labDoctorNavigationBase = [
  { id: "dashboard", label: "Tablou de bord", icon: LayoutDashboard },
  { id: "patients", label: "Pacienți", icon: Users },
  { id: "lab-requests", label: "Cereri analize", icon: FlaskConical },
  { id: "profile", label: "Profilul meu", icon: UserCircle },
];

const adminNavigation = [
  { id: "dashboard", label: "Tablou de bord", icon: LayoutDashboard },
  { id: "patients", label: "Pacienți", icon: Users },
  { id: "appointments", label: "Programări", icon: Calendar },
  { id: "doctors", label: "Medici", icon: UserCog },
  { id: "departments", label: "Departamente", icon: Building2 },
  { id: "audit-logs", label: "Jurnale de audit", icon: ClipboardList },
  { id: "profile", label: "Profilul meu", icon: UserCircle },
];

const patientNavigation = [
  { id: "patient-overview", label: "Prezentare generală", icon: LayoutDashboard },
  { id: "patient-history", label: "Istoric medical", icon: FileText },
  { id: "patient-labs", label: "Rezultate analize", icon: FlaskConical },
  { id: "patient-appointments", label: "Programări", icon: Calendar },
];

export default function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const logout = useAppStore((s) => s.logout);
  const initAuth = useAppStore((s) => s.initAuth);
  const user = useAppStore((s) => s.user);
  const patients = useAppStore((s) => s.patients);
  const fetchPatients = useAppStore((s) => s.fetchPatients);
  const departments = useAppStore((s) => s.departments);
  const labRequestUnreadCount = useAppStore((s) => s.labRequestUnreadCount);
  const fetchUnreadLabRequestCount = useAppStore((s) => s.fetchUnreadLabRequestCount);
  const fetchLabRequests = useAppStore((s) => s.fetchLabRequests);
  const schedulePendingCount = useAppStore((s) => s.schedulePendingCount);
  const fetchSchedulePendingCount = useAppStore((s) => s.fetchSchedulePendingCount);
  const unreadNotificationCount = useAppStore((s) => s.unreadNotificationCount);
  const fetchUnreadNotificationCount = useAppStore((s) => s.fetchUnreadNotificationCount);
  const fetchNotifications = useAppStore((s) => s.fetchNotifications);
  const doctors = useAppStore((s) => s.doctors);

  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [loginMode, setLoginMode] = useState<LoginMode>("doctor");
  const [authChecked, setAuthChecked] = useState(false);
  // For patient portal: which tab is active (passed down via activePage prefix)
  const [patientTab, setPatientTab] = useState("overview");

  const isPatient = user?.role === "patient";
  const isAdmin = user?.role === "admin";
  const isLabDoctor = user?.role === "lab_doctor";
  const isSpecialistDoctor = user?.role === "specialist_doctor";
  const isAnyDoctor = isLabDoctor || isSpecialistDoctor;

  const notifications = [
    ...(isSpecialistDoctor && schedulePendingCount > 0
      ? [
          {
            id: "schedule-pending",
            title: "Aprobare program necesară",
            description: `${schedulePendingCount} modificare${schedulePendingCount !== 1 ? "s" : ""} din admin în așteptarea aprobării`,
            page: "profile",
            Icon: CalendarDays,
            iconColor: "text-amber-500",
          },
        ]
      : []),
    ...(isLabDoctor && labRequestUnreadCount > 0
      ? [
          {
            id: "lab-unread",
            title: "Cereri de analize necitite",
            description: `${labRequestUnreadCount} cerere${labRequestUnreadCount !== 1 ? "s" : ""} nouă de revizuit`,
            page: "lab-requests",
            Icon: FlaskConical,
            iconColor: "text-purple-500",
          },
        ]
      : []),
    ...(isAnyDoctor && unreadNotificationCount > 0
      ? [
          {
            id: "notif-unread",
            title: "Notificări noi",
            description: `${unreadNotificationCount} notificare${unreadNotificationCount !== 1 ? "s" : ""} necitită`,
            page: "profile",
            Icon: Bell,
            iconColor: "text-blue-500",
          },
        ]
      : []),
  ];
  const totalNotificationCount =
    (isSpecialistDoctor ? schedulePendingCount : 0) +
    (isLabDoctor ? labRequestUnreadCount : 0) +
    (isAnyDoctor ? unreadNotificationCount : 0);

  // Role badge display helper
  const roleBadgeLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "specialist_doctor"
        ? "Medic specialist"
        : user?.role === "lab_doctor"
          ? "Medic laborator"
          : user?.role === "patient"
            ? "Pacient"
            : "";

  const roleBadgeColor =
    user?.role === "admin"
      ? "border-amber-300 text-amber-700 dark:text-amber-400"
      : user?.role === "specialist_doctor"
        ? "border-blue-300 text-blue-700 dark:text-blue-400"
        : user?.role === "lab_doctor"
          ? "border-purple-300 text-purple-700 dark:text-purple-400"
          : "border-emerald-300 text-emerald-700 dark:text-emerald-400";

  // Lab doctor nav with live unread badge on "lab-requests"
  const labDoctorNavigation = labDoctorNavigationBase.map((item) =>
    item.id === "lab-requests" && labRequestUnreadCount > 0 ? { ...item, badge: labRequestUnreadCount } : item,
  );

  // Specialist doctor nav with pending schedule badge on "profile"
  const specialistNavigationWithBadge = specialistNavigation.map((item) =>
    item.id === "profile" && schedulePendingCount > 0 ? { ...item, badge: schedulePendingCount } : item,
  );

  // Select navigation based on role
  const staffNavigation = isAdmin ? adminNavigation : isLabDoctor ? labDoctorNavigation : specialistNavigationWithBadge;

  // Patient badge uses real unread notifications instead of mock reminders.
  const reminderCount = isPatient ? unreadNotificationCount : 0;

  // Pre-fetch lab requests and poll unread count every 30 s when logged in as lab doctor
  useEffect(() => {
    if (!isLabDoctor) return;
    void fetchLabRequests();
    void fetchUnreadLabRequestCount();
    const id = setInterval(() => void fetchUnreadLabRequestCount(), 30_000);
    return () => clearInterval(id);
  }, [isLabDoctor, fetchLabRequests, fetchUnreadLabRequestCount]);

  // Poll schedule pending count every 30 s for specialist and lab doctors
  useEffect(() => {
    if (!isAnyDoctor || !user?.doctorId) return;
    void fetchSchedulePendingCount(user.doctorId);
    const id = setInterval(() => void fetchSchedulePendingCount(user.doctorId!), 30_000);
    return () => clearInterval(id);
  }, [isAnyDoctor, user?.doctorId, fetchSchedulePendingCount]);

  // Poll unread notification count every 30 s for doctor roles only.
  useEffect(() => {
    if (!isAuthenticated || !isAnyDoctor) return;
    void fetchUnreadNotificationCount();
    const id = setInterval(() => void fetchUnreadNotificationCount(), 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, isAnyDoctor, fetchUnreadNotificationCount]);

  // Patient portal reads reminders from notifications directly; a one-time fetch is enough.
  useEffect(() => {
    if (!isAuthenticated || !isPatient) return;
    void fetchNotifications();
  }, [isAuthenticated, isPatient, fetchNotifications]);

  // Attempt silent re-auth on mount via httpOnly refresh cookie
  useEffect(() => {
    initAuth().finally(() => setAuthChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAuthenticated) {
      if (isPatient) setActivePage("patient-overview");
      else setActivePage("dashboard");
    }
  }, [isAuthenticated, isPatient]);

  useEffect(() => {
    if (!isAuthenticated || !isPatient) return;
    void fetchPatients();
  }, [isAuthenticated, isPatient, fetchPatients]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleNavigate = (pageId: PageId) => {
    setActivePage(pageId);
    if (pageId.startsWith("patient-")) {
      setPatientTab(pageId.replace("patient-", ""));
    }
  };

  // ── FORCE PASSWORD CHANGE ─────────────────────────────────────────────────
  if (isAuthenticated && user?.mustChangePassword) {
    return <ForceChangePasswordPage />;
  }

  // ── NOT AUTHENTICATED ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (loginMode === "patient") {
      return <PatientLoginPage onLoginSuccess={() => {}} onSwitchToDoctor={() => setLoginMode("doctor")} />;
    }
    return (
      <LoginPage onLoginSuccess={() => setActivePage("dashboard")} onSwitchToPatient={() => setLoginMode("patient")} />
    );
  }

  // ── PATIENT PORTAL ────────────────────────────────────────────────────────
  if (isPatient) {
    const patient = patients.find((p) => p.id === user?.patientId) ?? patients[0];
    const activeNavId = activePage.startsWith("patient-") ? activePage : "patient-overview";

    const patientNavWithBadge = patientNavigation.map((nav) => ({
      ...nav,
      ...(nav.id === "patient-appointments" && reminderCount > 0 ? { badge: reminderCount } : {}),
    }));

    return (
      <PrimaryTemplate
        navigation={patientNavWithBadge}
        activePageId={activeNavId}
        onNavigate={handleNavigate}
        breadcrumbItems={[
          { label: "Portal Pacient" },
          {
            label: activePage
              .replace("patient-", "")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          },
        ]}
        showSearch={false}
        appName="MedKit"
        appLogoSrc="https://api.dicebear.com/9.x/initials/svg?seed=MK&backgroundColor=059669&fontFamily=Arial&fontSize=40&textColor=ffffff"
        appLogoAlt="MedKit Pacient Portal"
      >
        {/* Patient top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Portal Pacient</span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Înregistrările dvs. sunt criptate și protejate HIPAA
            </span>
          </div>
          <div className="flex items-center gap-2">
            {reminderCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 p-0"
                onClick={() => handleNavigate("patient-overview")}
              >
                <Bell className="w-4 h-4" />
                <Badge
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  variant="destructive"
                >
                  {reminderCount}
                </Badge>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2 text-sm hover:bg-muted">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-emerald-600/15 text-emerald-700 font-semibold">
                      {user ? getInitials(user.name) : "PT"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-300 text-emerald-700">
                    Pacient
                  </Badge>
                </div>
                {patient && (
                  <div className="px-3 py-1.5 border-b border-border mb-1">
                    <p className="text-xs text-muted-foreground">
                      Grupă sanguină: <span className="font-medium text-foreground">{patient.bloodType}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CNP: <span className="font-medium text-foreground">{patient.nationalId}</span>
                    </p>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Deconectare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Patient page content */}
        <div className="flex-1 p-4 sm:p-6 min-h-0 overflow-auto">
          <PatientDashboardPage
            activeTab={activePage.startsWith("patient-") ? activePage.replace("patient-", "") : "overview"}
            onTabChange={(tab) => handleNavigate(`patient-${tab}`)}
          />
        </div>
      </PrimaryTemplate>
    );
  }

  // ── DOCTOR / ADMIN PORTAL ─────────────────────────────────────────────────
  const getBreadcrumb = (): { label: string }[] => {
    if (activePage === "dashboard") return [{ label: "Tablou de bord" }];
    if (activePage === "patients") return [{ label: "Pacienți" }];
    if (activePage === "add-patient") return [{ label: "Pacienți" }, { label: "Adaugă pacient nou" }];
    if (activePage.startsWith("edit-patient-")) return [{ label: "Pacienți" }, { label: "Editează pacient" }];
    if (activePage === "appointments") return [{ label: "Programări" }];
    if (activePage === "create-appointment") return [{ label: "Programări" }, { label: "Programează consultație" }];
    // if (activePage === "chatbot") return [{ label: "Chatbot AI Calculi Renali" }];
    if (activePage === "doctors") return [{ label: "Medici" }];
    if (activePage === "add-doctor") return [{ label: "Medici" }, { label: "Adaugă medic nou" }];
    if (activePage.startsWith("edit-doctor-")) return [{ label: "Medici" }, { label: "Editează medic" }];
    if (activePage === "departments") return [{ label: "Departamente" }];
    if (activePage.startsWith("department-")) {
      const id = activePage.replace("department-", "");
      const dept = departments.find((d) => d.id === id);
      return [{ label: "Departamente" }, { label: dept?.name ?? "Departament" }];
    }
    if (activePage === "audit-logs") return [{ label: "Jurnale de audit" }];
    if (activePage === "profile") return [{ label: "Profilul meu" }];
    if (activePage === "lab-requests") return [{ label: "Cereri analize" }];
    if (activePage.startsWith("doctor-schedule-")) {
      const id = activePage.replace("doctor-schedule-", "");
      const doctor = doctors.find((d) => d.id === id);
      return [{ label: "Medici" }, { label: doctor?.name ?? "Medic" }, { label: "Program" }];
    }
    if (activePage.startsWith("create-appointment-patient-")) {
      const id = activePage.replace("create-appointment-patient-", "");
      const patient = patients.find((p) => p.id === id);
      return [{ label: "Pacienți" }, { label: patient?.fullName ?? "Pacient" }, { label: "Programează consultație" }];
    }
    if (activePage.startsWith("patient-")) {
      const id = activePage.replace("patient-", "");
      const patient = patients.find((p) => p.id === id);
      return [{ label: "Pacienți" }, { label: patient?.fullName ?? "Detalii pacient" }];
    }
    return [{ label: "Pagină" }];
  };

  const activeNavId =
    activePage.startsWith("patient-") ||
    activePage.startsWith("create-appointment-patient-") ||
    activePage === "add-patient" ||
    activePage.startsWith("edit-patient-")
      ? "patients"
      : activePage === "create-appointment"
        ? "appointments"
        : activePage === "add-doctor" || activePage.startsWith("edit-doctor-")
          ? "doctors"
          : activePage.startsWith("department-")
            ? "departments"
            : activePage.startsWith("doctor-schedule-")
              ? "doctors"
              : activePage;

  const renderPage = () => {
    if (activePage === "dashboard") return <DashboardPage onNavigate={handleNavigate} />;
    if (activePage === "doctors" && isAdmin) return <DoctorsPage onNavigate={handleNavigate} />;
    if (activePage === "departments" && isAdmin) return <DepartmentsPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("department-") && isAdmin) {
      const deptId = activePage.replace("department-", "");
      const dept = departments.find((d) => d.id === deptId);
      return (
        <DepartmentDoctorsPage
          departmentId={deptId}
          departmentName={dept?.name ?? "Department"}
          onNavigate={handleNavigate}
        />
      );
    }
    if (activePage === "add-doctor" && isAdmin) return <AddDoctorPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("edit-doctor-") && isAdmin)
      return <AddDoctorPage onNavigate={handleNavigate} editingDoctorId={activePage.replace("edit-doctor-", "")} />;
    if (activePage.startsWith("doctor-schedule-") && isAdmin) {
      const doctorId = activePage.replace("doctor-schedule-", "");
      const doctor = doctors.find((d) => d.id === doctorId);
      return (
        <AdminDoctorSchedulePage
          doctorId={doctorId}
          doctorName={doctor?.name ?? "Doctor"}
          onNavigate={handleNavigate}
        />
      );
    }
    if (activePage === "patients") return <PatientsPage onNavigate={handleNavigate} />;
    if (activePage === "add-patient") return <AddPatientPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("edit-patient-") && !activePage.startsWith("patient-"))
      return <AddPatientPage onNavigate={handleNavigate} editingPatientId={activePage.replace("edit-patient-", "")} />;
    if (activePage === "appointments" && !isLabDoctor) return <AppointmentsPage onNavigate={handleNavigate} />;
    if (activePage === "create-appointment" && !isLabDoctor)
      return <CreateAppointmentPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("create-appointment-patient-") && !isLabDoctor) {
      const patientId = activePage.replace("create-appointment-patient-", "");
      return <CreateAppointmentPage onNavigate={handleNavigate} preselectedPatientId={patientId} />;
    }
    if (activePage === "chatbot") return <ChatbotPage onNavigate={handleNavigate} />;
    if (activePage === "lab-requests" && isLabDoctor) return <LabRequestsPage />;
    if (activePage === "audit-logs" && isAdmin) return <AuditLogsPage />;
    if (activePage === "profile") return <DoctorProfilePage onNavigate={handleNavigate} />;
    if (activePage.startsWith("patient-")) {
      return <PatientDetailPage patientId={activePage.replace("patient-", "")} onNavigate={handleNavigate} />;
    }
    return <DashboardPage onNavigate={handleNavigate} />;
  };

  return (
    <PrimaryTemplate
      navigation={staffNavigation}
      activePageId={activeNavId}
      onNavigate={handleNavigate}
      breadcrumbItems={getBreadcrumb()}
      showSearch={false}
      appName="MedKit"
      appLogoSrc="https://api.dicebear.com/9.x/initials/svg?seed=MK&backgroundColor=0369a1&fontFamily=Arial&fontSize=40&textColor=ffffff"
      appLogoAlt="MedKit"
    >
      {/* Staff top status bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Conform HIPAA</span>
          <span className="w-px h-3 bg-border hidden sm:block" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Toate accesările sunt înregistrate și monitorizate
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
                <Bell className="w-4 h-4" />
                {totalNotificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {totalNotificationCount > 9 ? "9+" : totalNotificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold">Notificări</p>
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 py-6">
                  <Bell className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nicio notificare nouă</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="flex items-start gap-3 px-3 py-3 cursor-pointer"
                    onClick={() => handleNavigate(notif.page)}
                  >
                    <notif.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${notif.iconColor}`} />
                    <div>
                      <p className="text-sm font-medium leading-tight">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2 text-sm hover:bg-muted">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {user ? getInitials(user.name) : "DR"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className={`text-[10px] mt-1 ${roleBadgeColor}`}>
                  {roleBadgeLabel}
                </Badge>
              </div>
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleNavigate("profile")}>
                <User className="w-4 h-4 mr-2" />
                Profilul meu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Deconectare
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Doctor page content */}
      <div className="flex-1 p-4 sm:p-6 min-h-0 overflow-auto">{renderPage()}</div>
    </PrimaryTemplate>
  );
}
