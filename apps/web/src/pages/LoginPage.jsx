import { Mail, Moon, ShieldCheck, Sun, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useTheme } from "../components/ui/ThemeProvider";
import { useToast } from "../components/ui/ToastProvider";
import { supabase } from "../supabase";

function isAlreadyRegisteredError(errorText) {
  const normalized = String(errorText || "").toLowerCase();
  return normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("user already");
}

export default function LoginPage({ session }) {
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw signInError;
      }
      pushToast("Signed in", "success");
    } catch (err) {
      const text = err.message || "Sign in failed";
      setError(text);
      pushToast(text, "error");
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (isAlreadyRegisteredError(signUpError.message)) {
          const duplicate = "This email is already registered. Please sign in.";
          setError(duplicate);
          pushToast(duplicate, "error");
          return;
        }
        throw signUpError;
      }

      const maskedExisting = data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
      if (maskedExisting) {
        const duplicate = "This email is already registered. Please sign in.";
        setError(duplicate);
        pushToast(duplicate, "error");
        return;
      }

      const text = "Sign-up successful. Check your inbox if email confirmation is enabled.";
      setMessage(text);
      pushToast("Account created", "success");
    } catch (err) {
      const text = err.message || "Sign up failed";
      setError(text);
      pushToast(text, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="section-container">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs">so</span>
            Summora
          </Link>
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="aurora-block p-8">
            <div className="relative z-10 space-y-6">
              <Badge tone="brand">Workspace Access</Badge>
              <h1 className="max-w-xl text-4xl">Sign in to continue capturing and summarizing your meetings.</h1>
              <p className="max-w-xl text-base text-muted">
                Summora keeps long conversations structured with chunk-based transcription and readable AI summaries.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card variant="glass" className="p-4">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm text-muted">Use your email/password Supabase login to access your workspace.</p>
                </Card>
                <Card variant="glass" className="p-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm text-muted">Data stays scoped per authenticated user and secure session token.</p>
                </Card>
              </div>
            </div>
          </Card>

          <Card className="p-7">
            <form className="space-y-4" onSubmit={signIn}>
              <div>
                <h2 className="text-2xl">Welcome back</h2>
                <p className="mt-2 text-sm text-muted">Use your registered account to continue.</p>
              </div>

              <label className="field-label">
                Email
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="field-label">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? <div className="alert-error">{error}</div> : null}
              {message ? <div className="alert-success">{message}</div> : null}

              <div className="grid gap-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Working..." : "Sign In"}
                </Button>
                <Button type="button" variant="secondary" disabled={loading} className="w-full" onClick={signUp}>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}