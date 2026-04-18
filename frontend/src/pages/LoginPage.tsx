import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSwitchToPatient?: () => void;
}

export default function LoginPage({ onLoginSuccess, onSwitchToPatient }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAppStore((s) => s.login);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const rememberMeValue = watch("rememberMe");

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const success = login(data.email, data.password, data.rememberMe ?? false);
    setIsLoading(false);
    if (success) {
      onLoginSuccess();
    } else {
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">MedKit</h1>
          <p className="text-muted-foreground mt-1 text-sm">Secure Clinical Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Authorised personnel only. Unauthorised access is prohibited.
            </p>
          </div>

          {loginError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@hospital.com"
                autoComplete="email"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password")}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMeValue}
                onCheckedChange={(checked) => setValue("rememberMe", checked === true)}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Remember me for 7 days
              </Label>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Sign in securely
                </span>
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo credentials:</p>
            <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
              <div className="flex items-center justify-between gap-3">
                <span>admin@medkit.com</span>
                <span className="text-amber-600 font-semibold not-italic font-sans">Admin</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>doctor@medkit.com</span>
                <span className="text-blue-600 font-semibold not-italic font-sans">Specialist</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>dr.torres@medkit.com</span>
                <span className="text-blue-600 font-semibold not-italic font-sans">Specialist</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>lab@medkit.com</span>
                <span className="text-purple-600 font-semibold not-italic font-sans">Lab Doctor</span>
              </div>
              <p className="mt-1 text-foreground font-semibold not-italic font-sans">Password: MedKit2025!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Accounts are created by system administrators only.{" "}
          <span className="text-primary">Contact IT support</span> if you need access.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          🔒 This system is HIPAA-compliant. All access is logged and monitored.
        </p>
        {onSwitchToPatient && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSwitchToPatient}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2 transition-colors"
            >
              Are you a patient? Sign in to the Patient Portal →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
