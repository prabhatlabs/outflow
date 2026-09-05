import { useState } from "react";
import { Navigate } from "react-router";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { api, ApiError, getApiUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function Login() {
  const { user, status } = useAuthStore();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (status === "authenticated" && user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = () => {
    window.location.href = `${getApiUrl()}/auth/login/google`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await api.post<null>("/auth/login/email", { email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-svh flex-col justify-center p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Outflow</h1>
            <p className="text-sm text-muted-foreground">
              Split expenses with your people.
            </p>
          </div>
          <ModeToggle />
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-4xl border border-border bg-input/50 px-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              <Mail />
              {submitting ? "Sending..." : "Continue with email"}
            </Button>
          </form>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {sent && (
            <p className="text-sm text-muted-foreground">
              Magic link sent to {email}. (Email delivery not wired up yet.)
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default Login;