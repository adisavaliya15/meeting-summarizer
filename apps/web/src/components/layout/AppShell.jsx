import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function navClass({ isActive }) {
  if (isActive) {
    return "rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-soft";
  }
  return "rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
}

export default function AppShell({ session, onSignOut }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("ui-theme") || "light");
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const sidebarLinks = useMemo(
    () => [
      { to: "/", label: "Dashboard" },
      { to: "/", label: "Sessions" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white text-slate-900 transition dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white/90 p-5 backdrop-blur transition dark:border-slate-800 dark:bg-slate-950/90 md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Link to="/" className="flex items-center gap-2 rounded-xl px-2 py-2 text-xl font-bold text-brand-600 dark:text-brand-200">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">SO</span>
            Summora
          </Link>
          <nav className="mt-8 grid gap-2">
            {sidebarLinks.map((item) => (
              <NavLink key={`${item.to}-${item.label}`} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  Menu
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Workspace</p>
                  <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Summora</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {session?.user?.email?.split("@")[0] || "User"}
                  </button>
                  {userMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                      <p className="rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-300">{session?.user?.email}</p>
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}