import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

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
      setError(err.message || "Sign in failed");
      pushToast(err.message || "Sign in failed", "error");
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
          const duplicateMessage = "This email is already registered. Please sign in.";
          setError(duplicateMessage);
          pushToast(duplicateMessage, "error");
          return;
        }
        throw signUpError;
      }

      const existingAccountMaskedResponse = data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
      if (existingAccountMaskedResponse) {
        const duplicateMessage = "This email is already registered. Please sign in.";
        setError(duplicateMessage);
        pushToast(duplicateMessage, "error");
        return;
      }

      const text = "Sign-up successful. Check your inbox if email confirmation is enabled.";
      setMessage(text);
      pushToast("Account created", "success");
    } catch (err) {
      setError(err.message || "Sign up failed");
      pushToast(err.message || "Sign up failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-brand-50 to-white px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between">
        <Link to="/" className="text-sm font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200">
          Back to home
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div className="mx-auto mt-8 flex max-w-5xl justify-center">
        <form
          className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          onSubmit={signIn}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600 dark:text-brand-200">Summora</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Sign in to continue recording and summarizing meetings.</p>
          </div>

          <label className="field-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="input-base"
            />
          </label>

          <label className="field-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="input-base"
            />
          </label>

          {error ? <div className="alert-error">{error}</div> : null}
          {message ? <div className="alert-success">{message}</div> : null}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Working..." : "Sign In"}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={signUp} disabled={loading}>
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
