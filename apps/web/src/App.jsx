import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ContactPage from "./pages/marketing/ContactPage";
import LandingPage from "./pages/marketing/LandingPage";
import PricingPage from "./pages/marketing/PricingPage";
import ProductPage from "./pages/marketing/ProductPage";
import ProfilePage from "./pages/ProfilePage";
import SessionPage from "./pages/SessionPage";
import { supabase } from "./supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<PublicLayout session={session} />}>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route path="/login" element={<LoginPage session={session} />} />

      <Route element={<ProtectedRoute session={session} />}>
        <Route element={<AppLayout session={session} onSignOut={handleSignOut} />}>
          <Route path="/dashboard" element={<DashboardPage session={session} />} />
          <Route path="/sessions/:sessionId" element={<SessionPage session={session} />} />
          <Route path="/profile" element={<ProfilePage session={session} onSignOut={handleSignOut} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
