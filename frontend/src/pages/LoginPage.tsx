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
  email: z.string().min(1, "Email-ul este obligatoriu").email("Introduceți o adresă de email valid"),
  password: z.string().min(1, "Parola este obligatorie"),
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
    const success = await login(data.email, data.password, data.rememberMe ?? false);
    setIsLoading(false);
    if (success) {
      onLoginSuccess();
    } else {
      setLoginError("Email sau parolă incorectă. Vă rugăm să încercați din nou.");
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
          <p className="text-muted-foreground mt-1 text-sm">Sistem securizat de management clinic</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Autentificați-vă în cont</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Doar personal autorizat. Accesul neautorizat este interzis.
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
              <Label htmlFor="email">Adresă de email</Label>
              <Input
                id="email"
                type="email"
                placeholder="dvs@spital.ro"
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
              <Label htmlFor="password">Parolă</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Introduceți parola"
                  autoComplete="current-password"
                  {...register("password")}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
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
                Ține-mă minte 7 zile
              </Label>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Se autentifică...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Autentificare securizată
                </span>
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Date de acces demo:</p>
            <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
              <div className="flex items-center justify-between gap-3">
                <span>admin@medkit.com</span>
                <span className="text-amber-600 font-semibold not-italic font-sans">Administrator</span>
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
                <span className="text-purple-600 font-semibold not-italic font-sans">Medic laborator</span>
              </div>
              <p className="mt-1 text-foreground font-semibold not-italic font-sans">Parolă: MedKit2025!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Conturile sunt create doar de administratorii de sistem.{" "}
          <span className="text-primary">Contactați suportul IT</span> dacă aveți nevoie de acces.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          🔒 Acest sistem este conform HIPAA. Toate accesările sunt înregistrate și monitorizate.
        </p>
        {onSwitchToPatient && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSwitchToPatient}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2 transition-colors"
            >
              Ești pacient? Autentifică-te în Portalul Pacientului →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
