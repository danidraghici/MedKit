import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";


const schema = z.object({
  email: z.string().email("Introduceți o adresă de email validă"),
  password: z.string().min(1, "Parola este obligatorie"),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface PatientLoginPageProps {
  onLoginSuccess: () => void;
  onSwitchToDoctor: () => void;
}

export default function PatientLoginPage({ onLoginSuccess, onSwitchToDoctor }: PatientLoginPageProps) {
  const login = useAppStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");


  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit: import("react-hook-form").SubmitHandler<FormValues> = async (data) => {
    setLoginError("");
    const success = await login(data.email, data.password, data.rememberMe ?? false);
    if (success) {
      onLoginSuccess();
    } else {
      setLoginError("Email sau parolă incorectă. Vă rugăm să încercați din nou.");
    }
  };

  const fillDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "MedKit2025!");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border-2 border-white"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl">MedKit</span>
              <span className="text-emerald-200 text-xs block -mt-0.5">Portal Pacient</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Sănătatea ta,<br />în mâinile tale.
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-sm">
            Accesați istoricul medical, rezultatele de laborator cu analize bazate pe IA și programați consultații — totul într-un singur loc securizat.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[
            { icon: "📋", text: "Vizualizați istoricul medical complet și fișele dvs." },
            { icon: "🔬", text: "Analize IA ale rezultatelor de laborator — pe înțelesul tuturor" },
            { icon: "📅", text: "Solicitați programări online, oricând" },
            { icon: "🔔", text: "Memento-uri inteligente pentru controale și medicamente" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-emerald-100">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-6 -ml-1 text-muted-foreground" onClick={onSwitchToDoctor}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Autentificare medic
          </Button>

          {/* Logo (mobile) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg">MedKit</span>
              <span className="text-xs text-muted-foreground block -mt-0.5">Portal Pacient</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Autentificare pacient</h2>
            <p className="text-muted-foreground text-sm">Autentificați-vă pentru a accesa fișa medicală și programările.</p>
          </div>

          {loginError && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresă de email</Label>
              <Input id="email" type="email" placeholder="your@email.com" autoComplete="email" {...register("email")}
                className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Parolă</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  autoComplete="current-password" {...register("password")}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(v) => setValue("rememberMe", !!v)} />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">Ține-mă minte 7 zile</Label>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Se autentifică...</span>
              ) : "Autentificare în Portalul Pacientului"}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Conturi demo pacient</p>
            <div className="space-y-1.5">
              {[
                { name: "James Harrison", email: "james.harrison@email.com" },
                { name: "Maria Santos", email: "maria.santos@email.com" },
                { name: "Robert Chen", email: "robert.chen@email.com" },
              ].map((p) => (
                <button key={p.email} type="button" onClick={() => fillDemo(p.email)}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{p.name}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500 ml-2">{p.email}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">Password: <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">MedKit2025!</code></p>
          </div>

          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
            <span>Datele dvs. de sănătate sunt criptate și protejate conform reglementărilor de confidențialitate HIPAA. Nu partajăm niciodată informațiile dvs. fără consimțământul dvs.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
