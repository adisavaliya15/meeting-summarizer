import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useToast } from "../components/ui/ToastProvider";
import { supabase } from "../supabase";

export default function LoginPage({ session }) {
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (session) {
    return <Navigate to="/" replace />;
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
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        throw signUpError;
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-brand-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
  );
}