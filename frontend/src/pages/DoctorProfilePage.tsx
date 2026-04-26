import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  Shield,
  Clock,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  Edit3,
  Save,
  X,
  KeyRound,
  Bell,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Users,
  Lock,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { DoctorScheduleTab } from "@/components/DoctorScheduleTab";

// ─── Zod schemas ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  department: z.string().optional(),
  hospital: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  yearsExperience: z.string().optional(),
  languages: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── API response type ───────────────────────────────────────────────────────

interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  department: string | null;
  hospital: string | null;
  location: string | null;
  bio: string | null;
  yearsExperience: string | null;
  languages: string | null;
  joinedDate: string;
  lastLoginAt: string | null;
}

// ─── Notification rules (admin) ──────────────────────────────────────────────

interface NotificationRuleDto {
  id: string;
  title: string;
  description: string | null;
  targetAudience: "patients" | "doctors" | "admins" | "all";
  isActive: boolean;
  triggerEvent: "general" | "schedule_change" | "appointment_created" | "appointment_updated" | "lab_result_completed";
  createdById: string;
  createdAt: string;
  updatedAt: string;
}



// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DoctorProfilePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const user = useAppStore((s) => s.user);
  const schedulePendingCount = useAppStore((s) => s.schedulePendingCount);
  const fetchSchedulePendingCount = useAppStore((s) => s.fetchSchedulePendingCount);
  const notifications = useAppStore((s) => s.notifications);
  const fetchNotifications = useAppStore((s) => s.fetchNotifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const unreadNotificationCount = useAppStore((s) => s.unreadNotificationCount);

  useEffect(() => {
    if (user?.doctorId && user.role !== "admin") {
      void fetchSchedulePendingCount(user.doctorId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.doctorId, user?.role]);

  // Profile data fetched from API
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Credentials editing state (local mirror for the credentials tab inputs)
  const [credSpecialty, setCredSpecialty] = useState("");
  const [credLicense, setCredLicense] = useState("");
  const [credDepartment, setCredDepartment] = useState("");
  const [credHospital, setCredHospital] = useState("");
  const [credSaved, setCredSaved] = useState(false);

  // Password state
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Active profile tab (controlled so we can jump to schedule from notifications)
  const [activeTab, setActiveTab] = useState("profile");

  // Applicable notification rules (non-admin doctors)
  const [applicableRules, setApplicableRules] = useState<NotificationRuleDto[]>([]);

  // Notification rules state (admin only)
  const [rules, setRules] = useState<NotificationRuleDto[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRuleDto | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleAudience, setRuleAudience] = useState("all");
  const [ruleTrigger, setRuleTrigger] = useState("general");
  const [ruleActive, setRuleActive] = useState(true);
  const [ruleSaving, setRuleSaving] = useState(false);

  // ── Fetch profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    api.get<UserProfileDto>("/api/users/me")
      .then((data) => {
        setProfile(data);
        setCredSpecialty(data.specialty ?? "");
        setCredLicense(data.licenseNumber ?? "");
        setCredDepartment(data.department ?? "");
        setCredHospital(data.hospital ?? "");
        profileForm.reset({
          name: data.name,
          email: data.email,
          phone: data.phone ?? "",
          specialty: data.specialty ?? "",
          licenseNumber: data.licenseNumber ?? "",
          department: data.department ?? "",
          hospital: data.hospital ?? "",
          location: data.location ?? "",
          bio: data.bio ?? "",
          yearsExperience: data.yearsExperience ?? "",
          languages: data.languages ?? "",
        });
      })
      .catch(() => {/* silently keep null */})
      .finally(() => setProfileLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch notification rules on mount (admin only) ────────────────────────
  useEffect(() => {
    if (user?.role !== "admin") { setRulesLoading(false); return; }
    api.get<NotificationRuleDto[]>("/api/notification-rules")
      .then(setRules)
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch received notifications + applicable rules on mount (non-admin) ───
  useEffect(() => {
    if (user?.role === "admin") return;
    void fetchNotifications();
    api.get<NotificationRuleDto[]>("/api/notification-rules/applicable")
      .then(setApplicableRules)
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notification rule dialog helpers ──────────────────────────────────────
  const openCreateDialog = () => {
    setEditingRule(null);
    setRuleTitle(""); setRuleDesc(""); setRuleAudience("all"); setRuleTrigger("general"); setRuleActive(true);
    setRuleDialogOpen(true);
  };

  const openEditDialog = (rule: NotificationRuleDto) => {
    setEditingRule(rule);
    setRuleTitle(rule.title);
    setRuleDesc(rule.description ?? "");
    setRuleAudience(rule.targetAudience);
    setRuleTrigger(rule.triggerEvent);
    setRuleActive(rule.isActive);
    setRuleDialogOpen(true);
  };

  const saveRule = async () => {
    if (!ruleTitle.trim()) return;
    setRuleSaving(true);
    try {
      const body = {
        title: ruleTitle.trim(),
        description: ruleDesc.trim() || null,
        targetAudience: ruleAudience,
        triggerEvent: ruleTrigger,
        isActive: ruleActive,
      };
      if (editingRule) {
        const updated = await api.put<NotificationRuleDto>(
          `/api/notification-rules/${editingRule.id}`, body
        );
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.post<NotificationRuleDto>("/api/notification-rules", body);
        setRules((prev) => [created, ...prev]);
      }
      setRuleDialogOpen(false);
    } catch {
      // keep dialog open on error
    } finally {
      setRuleSaving(false);
    }
  };

  const audienceBadge = (audience: string) => {
    const variantMap: Record<string, "info" | "warning" | "secondary" | "success"> = {
      patients: "info",
      doctors: "warning",
      admins: "secondary",
      all: "success",
    };
    return <Badge variant={variantMap[audience] ?? "secondary"}>{audience}</Badge>;
  };

  const triggerLabel: Record<string, string> = {
    general: "Announcement",
    schedule_change: "Schedule change",
    appointment_created: "Appointment created",
    appointment_updated: "Appointment updated",
    lab_result_completed: "Lab result ready",
  };

  // ── Profile form ────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: "",
      specialty: "",
      licenseNumber: "",
      department: "",
      hospital: "",
      location: "",
      bio: "",
      yearsExperience: "",
      languages: "",
    },
  });

  const onSaveProfile = async (values: ProfileFormValues) => {
    try {
      const updated = await api.put<UserProfileDto>("/api/users/me", {
        name: values.name,
        phone: values.phone,
        specialty: values.specialty,
        licenseNumber: values.licenseNumber,
        department: values.department,
        hospital: values.hospital,
        location: values.location,
        bio: values.bio,
        yearsExperience: values.yearsExperience,
        languages: values.languages,
      });
      setProfile(updated);
      setCredSpecialty(updated.specialty ?? "");
      setCredLicense(updated.licenseNumber ?? "");
      setCredDepartment(updated.department ?? "");
      setCredHospital(updated.hospital ?? "");
    } catch {
      // keep existing profile, show generic error if desired
    }
    setIsEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3500);
  };

  const onCancelEdit = () => {
    profileForm.reset();
    setIsEditingProfile(false);
  };

  // ── Password form ────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (values: PasswordFormValues) => {
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPwError("");
      passwordForm.reset();
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Current password is incorrect.";
      setPwError(message);
    }
  };

  // ── Credentials save ──────────────────────────────────────────────────────
  const saveCredentials = async () => {
    try {
      const updated = await api.put<UserProfileDto>("/api/users/me", {
        name: profile?.name ?? user?.name ?? "",
        phone: profile?.phone,
        specialty: credSpecialty,
        licenseNumber: credLicense,
        department: credDepartment,
        hospital: credHospital,
        location: profile?.location,
        bio: profile?.bio,
        yearsExperience: profile?.yearsExperience,
        languages: profile?.languages,
      });
      setProfile(updated);
    } catch {
      // silently keep current values
    }
    setCredSaved(true);
    setTimeout(() => setCredSaved(false), 3500);
  };

// ── Role badge ────────────────────────────────────────────────────────────
  const roleBadge =
    user?.role === "admin" ? (
      <Badge variant="warning">Admin</Badge>
    ) : (
      <Badge variant="info">Physician</Badge>
    );

  if (profileLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal information, credentials, and account settings
        </p>
      </div>

      {/* ── Profile hero card ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20 text-2xl">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {getInitials(profile?.name ?? user?.name ?? "DR")}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.name ?? user?.name}</h2>
                {roleBadge}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {profile?.specialty ?? "—"} · {profile?.hospital ?? "—"}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email ?? user?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {profile?.phone ?? "—"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile?.location ?? "—"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {profile?.joinedDate ? formatJoinDate(profile.joinedDate) : "—"}
                </span>
              </div>
            </div>

            {/* Last login */}
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-xs text-muted-foreground">Last login</p>
              <p className="text-sm font-medium text-foreground">
                {profile?.lastLoginAt ? formatTimeAgo(profile.lastLoginAt) : "Unknown"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      {user?.role !== "admin" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Activity, label: "Consultations", value: "—", accent: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" },
            { icon: Users, label: "Patients managed", value: "—", accent: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" },
            { icon: FileText, label: "Records created", value: "—", accent: "bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400" },
          ].map(({ icon: Icon, label, value, accent }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className={`rounded-full p-2.5 ${accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-1.5" />
            Profile
          </TabsTrigger>
          {user?.role !== "admin" && (
            <TabsTrigger value="credentials">
              <Shield className="w-4 h-4 mr-1.5" />
              Credentials
            </TabsTrigger>
          )}
          <TabsTrigger value="security">
            <KeyRound className="w-4 h-4 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-1.5" />
            Notifications
          </TabsTrigger>
          {user?.role !== "admin" && (
            <TabsTrigger value="schedule" className="relative">
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Schedule
              {schedulePendingCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {schedulePendingCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ══ TAB: Profile ══════════════════════════════════════════════ */}
        <TabsContent value="profile" className="space-y-4">
          {profileSaved && (
            <Alert variant="success">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>Profile updated successfully.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Personal Information</CardTitle>
              {!isEditingProfile ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onCancelEdit} className="gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={profileForm.handleSubmit(onSaveProfile)} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    Save changes
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {!isEditingProfile ? (
                /* ── Read-only view ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {[
                    { icon: User, label: "Full name", value: profile?.name ?? user?.name ?? "" },
                    { icon: Mail, label: "Email address", value: profile?.email ?? user?.email ?? "" },
                    { icon: Phone, label: "Phone number", value: profile?.phone ?? "—" },
                    { icon: MapPin, label: "Location", value: profile?.location ?? "—" },
                    { icon: Building2, label: "Hospital / clinic", value: profile?.hospital ?? "—" },
                    { icon: Clock, label: "Years of experience", value: profile?.yearsExperience ? `${profile.yearsExperience} years` : "—" },
                    { icon: BookOpen, label: "Languages spoken", value: profile?.languages ?? "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}

                  {profile?.bio && (
                    <div className="sm:col-span-2 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Edit form ─── */
                <form
                  onSubmit={profileForm.handleSubmit(onSaveProfile)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
                >
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" {...profileForm.register("name")} />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" {...profileForm.register("email")} disabled />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact admin.</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" {...profileForm.register("phone")} />
                    {profileForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="City, State, Country" {...profileForm.register("location")} />
                  </div>

                  {/* Hospital */}
                  <div className="space-y-1.5">
                    <Label htmlFor="hospital">Hospital / clinic</Label>
                    <Input id="hospital" {...profileForm.register("hospital")} />
                    {profileForm.formState.errors.hospital && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.hospital.message}</p>
                    )}
                  </div>

                  {/* Years of experience */}
                  <div className="space-y-1.5">
                    <Label htmlFor="yearsExperience">Years of experience</Label>
                    <Select
                      defaultValue={profile?.yearsExperience ?? ""}
                      onValueChange={(v) => profileForm.setValue("yearsExperience", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select years" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 40 }, (_, i) => i + 1).map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y} {y === 1 ? "year" : "years"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Languages */}
                  <div className="space-y-1.5">
                    <Label htmlFor="languages">Languages spoken</Label>
                    <Input id="languages" placeholder="e.g. English, French" {...profileForm.register("languages")} />
                  </div>

                  {/* Bio */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      rows={3}
                      placeholder="Brief professional biography..."
                      {...profileForm.register("bio")}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Credentials ══════════════════════════════════════════ */}
        {user?.role !== "admin" && <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Medical Credentials</CardTitle>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {[
                  { icon: Stethoscope, label: "Medical specialty", value: credSpecialty || "—" },
                  { icon: Shield, label: "License number", value: credLicense || "—" },
                  { icon: Building2, label: "Department", value: credDepartment || "—" },
                  { icon: Award, label: "Years of experience", value: profile?.yearsExperience ? `${profile.yearsExperience} years` : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Credential edit fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label>Specialty</Label>
                  <Input
                    value={credSpecialty}
                    onChange={(e) => setCredSpecialty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>License number</Label>
                  <Input
                    value={credLicense}
                    onChange={(e) => setCredLicense(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    value={credDepartment}
                    onChange={(e) => setCredDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hospital / clinic</Label>
                  <Input
                    value={credHospital}
                    onChange={(e) => setCredHospital(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={saveCredentials}
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save credentials
                </Button>
              </div>

              {credSaved && (
                <Alert variant="success">
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>Credentials updated successfully.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Access info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Role", value: "Physician", icon: Shield },
                  { label: "Account status", value: "Active", icon: CheckCircle2 },
                  { label: "Last login", value: profile?.lastLoginAt ? formatTimeAgo(profile.lastLoginAt) : "Unknown", icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              <Alert variant="info" size="compact">
                <AlertDescription>
                  Account creation and role changes are managed by your system administrator.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* ══ TAB: Security ══════════════════════════════════════════════ */}
        <TabsContent value="security" className="space-y-4">
          {pwSaved && (
            <Alert variant="success">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>Password changed successfully.</AlertDescription>
            </Alert>
          )}
          {pwError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{pwError}</AlertDescription>
            </Alert>
          )}

          {/* Change password */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Change Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
                {/* Current password */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      {...passwordForm.register("currentPassword")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                  <ul className="text-xs text-muted-foreground space-y-0.5 mt-1 ml-1">
                    <li>• Minimum 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one number</li>
                    <li>• At least one special character (!@#$…)</li>
                  </ul>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      {...passwordForm.register("confirmPassword")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  Change password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* HIPAA security info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Security & Compliance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Session timeout", value: "Auto-logout after 30 min of inactivity" },
                { label: "Audit logging", value: "All data access is logged for HIPAA compliance" },
                { label: "Encryption", value: "Data encrypted at rest (AES-256) and in transit (TLS 1.3)" },
                { label: "Access control", value: "Role-based access — only authorised staff see PHI" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{value}</p>
                  </div>
                  <Badge variant="success" className="shrink-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Notifications ════════════════════════════════════════ */}
        <TabsContent value="notifications" className="space-y-4">

          {/* ── Admin: notification rules management ── */}
          {user?.role === "admin" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Notification Rules</CardTitle>
                  <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    New rule
                  </Button>
                </CardHeader>
                <CardContent>
                  {rulesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notification rules yet. Create one to get started.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {rules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between py-3 gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{rule.title}</p>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {triggerLabel[rule.triggerEvent] ?? rule.triggerEvent}
                            </Badge>
                            {audienceBadge(rule.targetAudience)}
                            <Badge variant={rule.isActive ? "success" : "secondary"}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRule ? "Edit rule" : "New notification rule"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input
                        value={ruleTitle}
                        onChange={(e) => setRuleTitle(e.target.value)}
                        placeholder="e.g. New appointment booked"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Description{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        rows={3}
                        value={ruleDesc}
                        onChange={(e) => setRuleDesc(e.target.value)}
                        placeholder="Describe when this notification fires…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Trigger</Label>
                      <Select value={ruleTrigger} onValueChange={setRuleTrigger}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General announcement</SelectItem>
                          <SelectItem value="schedule_change">Doctor schedule change</SelectItem>
                          <SelectItem value="appointment_created">Appointment created</SelectItem>
                          <SelectItem value="appointment_updated">Appointment status update</SelectItem>
                          <SelectItem value="lab_result_completed">Lab result completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Target audience</Label>
                      <Select value={ruleAudience} onValueChange={setRuleAudience}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All users</SelectItem>
                          <SelectItem value="patients">Patients</SelectItem>
                          <SelectItem value="doctors">Doctors</SelectItem>
                          <SelectItem value="admins">Admins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveRule} disabled={!ruleTitle.trim() || ruleSaving}>
                      {ruleSaving ? "Saving…" : "Save rule"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ── Non-admin: personal notification preferences ── */}
          {user?.role !== "admin" && (
          <>

          {/* Received notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Received Notifications</CardTitle>
                {unreadNotificationCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {unreadNotificationCount} unread
                  </Badge>
                )}
              </div>
              {notifications.length > 0 && unreadNotificationCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void markAllNotificationsRead()}
                  className="gap-1.5 text-xs"
                >
                  Mark all read
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                  <p className="text-xs text-muted-foreground">
                    When an administrator sends a notification or proposes schedule changes, you'll see them here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 py-3 px-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${!notif.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                      onClick={() => {
                        if (!notif.isRead) void markNotificationRead(notif.id);
                        if (notif.relatedEntityType === "appointment") {
                          onNavigate?.("appointments");
                        } else if (notif.relatedEntityType === "doctor_schedule") {
                          setActiveTab("schedule");
                        }
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.isRead ? "bg-blue-500" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!notif.isRead ? "font-semibold" : "font-medium"}`}>
                            {notif.title}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        {notif.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        {notif.relatedEntityType === "doctor_schedule" && (
                          <Badge variant="secondary" className="text-[10px] mt-1.5 px-1.5 py-0 gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Schedule change
                          </Badge>
                        )}
                        {notif.relatedEntityType === "appointment" && (
                          <Badge variant="secondary" className="text-[10px] mt-1.5 px-1.5 py-0 gap-1">
                            <Calendar className="w-3 h-3" />
                            Appointment
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Active Notification Rules</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Configured by your administrator — these are the events that will trigger in-app notifications for you.
              </p>
            </CardHeader>
            <CardContent>
              {applicableRules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active notification rules apply to your role.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {applicableRules.map((rule) => (
                    <div key={rule.id} className="flex items-start gap-3 py-3.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{rule.title}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {triggerLabel[rule.triggerEvent] ?? rule.triggerEvent}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ══ TAB: Schedule ════════════════════════════════════════════════ */}
        {user?.role !== "admin" && (
          <TabsContent value="schedule" className="space-y-4">
            {user?.doctorId ? (
              <DoctorScheduleTab doctorId={user.doctorId} />
            ) : (
              <p className="text-sm text-muted-foreground">No doctor record is linked to your account.</p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
