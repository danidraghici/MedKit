import { useState } from "react";
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
  Edit3,
  Save,
  X,
  KeyRound,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Users,
  Lock,
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
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";

// ─── Zod schemas ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number is too short"),
  specialty: z.string().min(2, "Specialty is required"),
  licenseNumber: z.string().min(4, "License number is required"),
  department: z.string().min(2, "Department is required"),
  hospital: z.string().min(2, "Hospital / clinic name is required"),
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

// ─── Static doctor extended data (per logged-in user id) ────────────────────

const DOCTOR_EXTENDED: Record<
  string,
  {
    specialty: string;
    licenseNumber: string;
    department: string;
    hospital: string;
    location: string;
    bio: string;
    yearsExperience: string;
    languages: string;
    phone: string;
    joinedDate: string;
    lastLogin: string;
    consultations: number;
    patientsManaged: number;
    recordsCreated: number;
  }
> = {
  u001: {
    specialty: "Nephrology",
    licenseNumber: "MD-NEP-10293",
    department: "Nephrology & Urology",
    hospital: "St. Mary's Medical Center",
    location: "Boston, MA, USA",
    bio: "Board-certified nephrologist with a special interest in kidney stone disease, chronic kidney disease management, and renal transplantation. Passionate about integrating clinical decision support tools into everyday practice.",
    yearsExperience: "14",
    languages: "English, Spanish",
    phone: "+1 (617) 555-0142",
    joinedDate: "2019-03-15",
    lastLogin: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    consultations: 1842,
    patientsManaged: 312,
    recordsCreated: 2940,
  },
  u002: {
    specialty: "Administration",
    licenseNumber: "ADM-00021",
    department: "Medical Administration",
    hospital: "St. Mary's Medical Center",
    location: "Boston, MA, USA",
    bio: "System administrator responsible for managing user accounts, access permissions, and compliance monitoring.",
    yearsExperience: "8",
    languages: "English",
    phone: "+1 (617) 555-0199",
    joinedDate: "2020-01-10",
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    consultations: 0,
    patientsManaged: 0,
    recordsCreated: 0,
  },
  u003: {
    specialty: "Internal Medicine",
    licenseNumber: "MD-INT-87654",
    department: "Internal Medicine",
    hospital: "Boston General Hospital",
    location: "Cambridge, MA, USA",
    bio: "Internal medicine physician focused on preventive care, chronic disease management, and evidence-based medicine. Active clinical researcher with publications in hypertension and diabetes.",
    yearsExperience: "11",
    languages: "English, Portuguese",
    phone: "+1 (617) 555-0177",
    joinedDate: "2021-06-01",
    lastLogin: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    consultations: 1203,
    patientsManaged: 198,
    recordsCreated: 1760,
  },
};

// ─── Notifications config ────────────────────────────────────────────────────

interface NotifSettings {
  newPatient: boolean;
  appointmentReminder: boolean;
  labResultsReady: boolean;
  criticalAlert: boolean;
  systemUpdates: boolean;
  chatbotExports: boolean;
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

export default function DoctorProfilePage() {
  const user = useAppStore((s) => s.user);

  const ext = DOCTOR_EXTENDED[user?.id ?? "u001"] ?? DOCTOR_EXTENDED["u001"];

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password state
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Notifications state
  const [notif, setNotif] = useState<NotifSettings>({
    newPatient: true,
    appointmentReminder: true,
    labResultsReady: true,
    criticalAlert: true,
    systemUpdates: false,
    chatbotExports: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Local editable extended data
  const [extData, setExtData] = useState(ext);

  // ── Profile form ────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: extData.phone,
      specialty: extData.specialty,
      licenseNumber: extData.licenseNumber,
      department: extData.department,
      hospital: extData.hospital,
      location: extData.location,
      bio: extData.bio,
      yearsExperience: extData.yearsExperience,
      languages: extData.languages,
    },
  });

  const onSaveProfile = (values: ProfileFormValues) => {
    setExtData((prev) => ({
      ...prev,
      phone: values.phone,
      specialty: values.specialty,
      licenseNumber: values.licenseNumber,
      department: values.department,
      hospital: values.hospital,
      location: values.location ?? prev.location,
      bio: values.bio ?? prev.bio,
      yearsExperience: values.yearsExperience ?? prev.yearsExperience,
      languages: values.languages ?? prev.languages,
    }));
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

  const onChangePassword = (values: PasswordFormValues) => {
    if (values.currentPassword !== "MedKit2025!") {
      setPwError("Current password is incorrect.");
      return;
    }
    setPwError("");
    passwordForm.reset();
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3500);
  };

  // ── Notifications save ────────────────────────────────────────────────────
  const saveNotifications = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3500);
  };

  // ── Role badge ────────────────────────────────────────────────────────────
  const roleBadge =
    user?.role === "admin" ? (
      <Badge variant="warning">Admin</Badge>
    ) : (
      <Badge variant="info">Physician</Badge>
    );

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
                  {getInitials(user?.name ?? "DR")}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
                {roleBadge}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {extData.specialty} · {extData.hospital}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {extData.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {extData.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {formatJoinDate(extData.joinedDate)}
                </span>
              </div>
            </div>

            {/* Last login */}
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-xs text-muted-foreground">Last login</p>
              <p className="text-sm font-medium text-foreground">{formatTimeAgo(extData.lastLogin)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      {user?.role !== "admin" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Activity, label: "Consultations", value: extData.consultations.toLocaleString(), accent: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" },
            { icon: Users, label: "Patients managed", value: extData.patientsManaged.toLocaleString(), accent: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" },
            { icon: FileText, label: "Records created", value: extData.recordsCreated.toLocaleString(), accent: "bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400" },
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
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Shield className="w-4 h-4 mr-1.5" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="w-4 h-4 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-1.5" />
            Notifications
          </TabsTrigger>
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
                    { icon: User, label: "Full name", value: user?.name ?? "" },
                    { icon: Mail, label: "Email address", value: user?.email ?? "" },
                    { icon: Phone, label: "Phone number", value: extData.phone },
                    { icon: MapPin, label: "Location", value: extData.location },
                    { icon: Building2, label: "Hospital / clinic", value: extData.hospital },
                    { icon: Clock, label: "Years of experience", value: `${extData.yearsExperience} years` },
                    { icon: BookOpen, label: "Languages spoken", value: extData.languages },
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

                  {extData.bio && (
                    <div className="sm:col-span-2 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-sm text-foreground leading-relaxed">{extData.bio}</p>
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
                      defaultValue={extData.yearsExperience}
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
        <TabsContent value="credentials" className="space-y-4">
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
                  { icon: Stethoscope, label: "Medical specialty", value: extData.specialty },
                  { icon: Shield, label: "License number", value: extData.licenseNumber },
                  { icon: Building2, label: "Department", value: extData.department },
                  { icon: Award, label: "Years of experience", value: `${extData.yearsExperience} years` },
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
                    value={extData.specialty}
                    onChange={(e) => setExtData((p) => ({ ...p, specialty: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>License number</Label>
                  <Input
                    value={extData.licenseNumber}
                    onChange={(e) => setExtData((p) => ({ ...p, licenseNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    value={extData.department}
                    onChange={(e) => setExtData((p) => ({ ...p, department: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hospital / clinic</Label>
                  <Input
                    value={extData.hospital}
                    onChange={(e) => setExtData((p) => ({ ...p, hospital: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setProfileSaved(true);
                    setTimeout(() => setProfileSaved(false), 3500);
                  }}
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save credentials
                </Button>
              </div>

              {profileSaved && (
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
                  { label: "Role", value: user?.role === "admin" ? "Administrator" : "Physician", icon: Shield },
                  { label: "Account status", value: "Active", icon: CheckCircle2 },
                  { label: "Last login", value: formatTimeAgo(extData.lastLogin), icon: Clock },
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
        </TabsContent>

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
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
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
          {notifSaved && (
            <Alert variant="success">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>Notification preferences saved.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  {
                    key: "criticalAlert" as const,
                    label: "Critical alerts",
                    description: "Urgent patient alerts and emergency notifications",
                    locked: true,
                  },
                  {
                    key: "newPatient" as const,
                    label: "New patient added",
                    description: "Notify when a new patient is registered in the system",
                  },
                  {
                    key: "appointmentReminder" as const,
                    label: "Appointment reminders",
                    description: "Reminders 24 hours and 1 hour before scheduled appointments",
                  },
                  {
                    key: "labResultsReady" as const,
                    label: "Lab results ready",
                    description: "Notify when new lab results are added to a patient record",
                  },
                  {
                    key: "chatbotExports" as const,
                    label: "Chatbot exports",
                    description: "Notify when a chatbot conversation is attached to a patient record",
                  },
                  {
                    key: "systemUpdates" as const,
                    label: "System updates",
                    description: "MedKit platform announcements and feature updates",
                  },
                ] as const
              ).map((item) => {
                const { key, label, description } = item;
                const locked = 'locked' in item ? item.locked : false;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {notif[key] ? (
                          <Bell className="w-4 h-4 text-primary" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          {label}
                          {locked ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Required
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notif[key]}
                      disabled={locked}
                      onCheckedChange={(v) => setNotif((p) => ({ ...p, [key]: v }))}
                      className="ml-4 shrink-0"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveNotifications} className="gap-1.5">
              <Save className="w-4 h-4" />
              Save preferences
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
