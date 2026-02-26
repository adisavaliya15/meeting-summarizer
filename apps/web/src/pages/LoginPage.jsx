import { useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "../supabase";

export default function LoginPage({ session }) {
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
    } catch (err) {
      setError(err.message || "Sign in failed");
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
      setMessage("Sign-up successful. Check your inbox if email confirmation is enabled.");
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <form className="card form" onSubmit={signIn}>
        <h1>Meeting Summarizer</h1>
        <p>Sign in to start recording and summarizing meetings.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Working..." : "Sign In"}
        </button>
        <button type="button" className="secondary" onClick={signUp} disabled={loading}>
          Create Account
        </button>
      </form>
    </div>
  );
}