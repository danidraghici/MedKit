import { useState } from "react";
import { KeyRound, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function ForceChangePasswordPage() {
  const logout = useAppStore((s) => s.logout);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Parola trebuie să aibă cel puțin 8 caractere.";
    if (!/[A-Z]/.test(pw)) return "Parola trebuie să conțină o literă majusculă.";
    if (!/[a-z]/.test(pw)) return "Parola trebuie să conțină o literă minusculă.";
    if (!/\d/.test(pw)) return "Parola trebuie să conțină o cifră.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Parola trebuie să conțină un caracter special.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Parolele noi nu se potrivesc.");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => logout(), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Schimbarea parolei a eșuat.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Schimbare parolă obligatorie</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Contul dvs. a fost creat cu o parolă temporară. Trebuie să setați o parolă nouă înainte de a continua.
            </p>
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 text-center">
            Parola a fost schimbată cu succes. Redirecționare spre autentificare…
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`bg-card border border-border rounded-xl p-6 space-y-4 ${success ? "opacity-50 pointer-events-none" : ""}`}>
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Parola curentă</Label>
            <p className="text-xs text-muted-foreground">Folosiți parola temporară: <span className="font-mono font-medium text-foreground">MedKit2026!</span></p>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Parola nouă</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmați parola nouă</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requirements */}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Parola trebuie să aibă cel puțin 8 caractere și să includă o literă majusculă, o literă minusculă, o cifră și un caracter special.
          </p>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full gap-2">
            <KeyRound className="w-4 h-4" />
            {loading ? "Se schimbă parola..." : "Setați parola nouă"}
          </Button>
        </form>
      </div>
    </div>
  );
}
