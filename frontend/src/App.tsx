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

type PageId = string;
type LoginMode = "doctor" | "patient";

// ── Navigation by role ────────────────────────────────────────────────────────
const specialistNavigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "chatbot", label: "Kidney Stone AI", icon: MessageSquare },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

const labDoctorNavigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

const adminNavigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "doctors", label: "Doctors", icon: UserCog },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

const patientNavigation = [
  { id: "patient-overview", label: "Overview", icon: LayoutDashboard },
  { id: "patient-history", label: "Medical history", icon: FileText },
  { id: "patient-labs", label: "Lab results", icon: FlaskConical },
  { id: "patient-appointments", label: "Appointments", icon: Calendar },
];

export default function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const logout = useAppStore((s) => s.logout);
  const initAuth = useAppStore((s) => s.initAuth);
  const user = useAppStore((s) => s.user);
  const patients = useAppStore((s) => s.patients);
  const departments = useAppStore((s) => s.departments);
  const getPatientReminders = useAppStore((s) => s.getPatientReminders);

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

  // Role badge display helper
  const roleBadgeLabel = user?.role === "admin"
    ? "Admin"
    : user?.role === "specialist_doctor"
    ? "Specialist Doctor"
    : user?.role === "lab_doctor"
    ? "Lab Doctor"
    : user?.role === "patient"
    ? "Patient"
    : "";

  const roleBadgeColor = user?.role === "admin"
    ? "border-amber-300 text-amber-700 dark:text-amber-400"
    : user?.role === "specialist_doctor"
    ? "border-blue-300 text-blue-700 dark:text-blue-400"
    : user?.role === "lab_doctor"
    ? "border-purple-300 text-purple-700 dark:text-purple-400"
    : "border-emerald-300 text-emerald-700 dark:text-emerald-400";

  // Select navigation based on role
  const staffNavigation = isAdmin
    ? adminNavigation
    : isLabDoctor
    ? labDoctorNavigation
    : specialistNavigation;

  // Reminder count badge
  const reminderCount = isPatient && user?.patientId
    ? getPatientReminders(user.patientId).length
    : 0;

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
      return (
        <PatientLoginPage
          onLoginSuccess={() => {}}
          onSwitchToDoctor={() => setLoginMode("doctor")}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={() => setActivePage("dashboard")}
        onSwitchToPatient={() => setLoginMode("patient")}
      />
    );
  }

  // ── PATIENT PORTAL ────────────────────────────────────────────────────────
  if (isPatient) {
    const patient = patients.find((p) => p.id === user?.patientId);
    const activeNavId = activePage.startsWith("patient-") ? activePage : "patient-overview";

    const patientNavWithBadge = patientNavigation.map((nav) => ({
      ...nav,
      ...(nav.id === "patient-appointments" && reminderCount > 0
        ? { badge: reminderCount }
        : {}),
    }));

    return (
      <PrimaryTemplate
        navigation={patientNavWithBadge}
        activePageId={activeNavId}
        onNavigate={handleNavigate}
        breadcrumbItems={[{ label: "Patient Portal" }, { label: activePage.replace("patient-", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }]}
        showSearch={false}
        appName="MedKit"
        appLogoSrc="https://api.dicebear.com/9.x/initials/svg?seed=MK&backgroundColor=059669&fontFamily=Arial&fontSize=40&textColor=ffffff"
        appLogoAlt="MedKit Patient Portal"
      >
        {/* Patient top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Patient Portal</span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Your records are encrypted and HIPAA-protected</span>
          </div>
          <div className="flex items-center gap-2">
            {reminderCount > 0 && (
              <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0" onClick={() => handleNavigate("patient-overview")}>
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]" variant="destructive">
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
                  <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-300 text-emerald-700">Patient</Badge>
                </div>
                {patient && (
                  <div className="px-3 py-1.5 border-b border-border mb-1">
                    <p className="text-xs text-muted-foreground">Blood type: <span className="font-medium text-foreground">{patient.bloodType}</span></p>
                    <p className="text-xs text-muted-foreground">ID: <span className="font-medium text-foreground">{patient.nationalId}</span></p>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
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
    if (activePage === "dashboard") return [{ label: "Dashboard" }];
    if (activePage === "patients") return [{ label: "Patients" }];
    if (activePage === "add-patient") return [{ label: "Patients" }, { label: "Add New Patient" }];
    if (activePage.startsWith("edit-patient-")) return [{ label: "Patients" }, { label: "Edit Patient" }];
    if (activePage === "appointments") return [{ label: "Appointments" }];
    if (activePage === "create-appointment") return [{ label: "Appointments" }, { label: "Schedule Appointment" }];
    if (activePage === "chatbot") return [{ label: "Kidney Stone AI Chatbot" }];
    if (activePage === "doctors") return [{ label: "Doctors" }];
    if (activePage === "add-doctor") return [{ label: "Doctors" }, { label: "Add New Doctor" }];
    if (activePage.startsWith("edit-doctor-")) return [{ label: "Doctors" }, { label: "Edit Doctor" }];
    if (activePage === "departments") return [{ label: "Departments" }];
    if (activePage.startsWith("department-")) {
      const id = activePage.replace("department-", "");
      const dept = departments.find((d) => d.id === id);
      return [{ label: "Departments" }, { label: dept?.name ?? "Department" }];
    }
    if (activePage === "profile") return [{ label: "My Profile" }];
    if (activePage.startsWith("create-appointment-patient-")) {
      const id = activePage.replace("create-appointment-patient-", "");
      const patient = patients.find((p) => p.id === id);
      return [{ label: "Patients" }, { label: patient?.fullName ?? "Patient" }, { label: "Schedule Appointment" }];
    }
    if (activePage.startsWith("patient-")) {
      const id = activePage.replace("patient-", "");
      const patient = patients.find((p) => p.id === id);
      return [{ label: "Patients" }, { label: patient?.fullName ?? "Patient Detail" }];
    }
    return [{ label: "Page" }];
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
      : activePage;

  const renderPage = () => {
    if (activePage === "dashboard") return <DashboardPage onNavigate={handleNavigate} />;
    if (activePage === "doctors" && isAdmin) return <DoctorsPage onNavigate={handleNavigate} />;
    if (activePage === "departments" && isAdmin) return <DepartmentsPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("department-") && isAdmin) {
      const deptId = activePage.replace("department-", "");
      const dept = departments.find((d) => d.id === deptId);
      return <DepartmentDoctorsPage departmentId={deptId} departmentName={dept?.name ?? "Department"} onNavigate={handleNavigate} />;
    }
    if (activePage === "add-doctor" && isAdmin) return <AddDoctorPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("edit-doctor-") && isAdmin) return <AddDoctorPage onNavigate={handleNavigate} editingDoctorId={activePage.replace("edit-doctor-", "")} />;
    if (activePage === "patients") return <PatientsPage onNavigate={handleNavigate} />;
    if (activePage === "add-patient") return <AddPatientPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("edit-patient-") && !activePage.startsWith("patient-")) return <AddPatientPage onNavigate={handleNavigate} editingPatientId={activePage.replace("edit-patient-", "")} />;
    if (activePage === "appointments" && !isLabDoctor) return <AppointmentsPage onNavigate={handleNavigate} />;
    if (activePage === "create-appointment" && !isLabDoctor) return <CreateAppointmentPage onNavigate={handleNavigate} />;
    if (activePage.startsWith("create-appointment-patient-") && !isLabDoctor) {
      const patientId = activePage.replace("create-appointment-patient-", "");
      return <CreateAppointmentPage onNavigate={handleNavigate} preselectedPatientId={patientId} />;
    }
    if (activePage === "chatbot") return <ChatbotPage onNavigate={handleNavigate} />;
    if (activePage === "profile") return <DoctorProfilePage />;
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
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">HIPAA-Compliant</span>
          <span className="w-px h-3 bg-border hidden sm:block" />
          <span className="text-xs text-muted-foreground hidden sm:inline">All access is logged and monitored</span>
        </div>
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
              My profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Doctor page content */}
      <div className="flex-1 p-4 sm:p-6 min-h-0 overflow-auto">
        {renderPage()}
      </div>
    </PrimaryTemplate>
  );
}
