import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { useTheme } from "../ui/ThemeProvider";

function navClass(active) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${
    active
      ? "bg-brand-600 text-white shadow-soft"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;
}

export default function AppLayout({ session, onSignOut }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const sidebarLinks = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", match: (path) => path === "/dashboard" },
      { to: "/dashboard#sessions", label: "Sessions", match: (path) => path === "/dashboard" },
      { to: "/profile", label: "Profile", match: (path) => path === "/profile" },
    ],
    [],
  );

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white/74 p-5 backdrop-blur-xl transition dark:border-slate-800 dark:bg-slate-950/72 md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-2 py-2 text-xl font-bold text-brand-600 dark:text-brand-200">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">SO</span>
            Summora
          </Link>

          <nav className="mt-8 grid gap-2">
            {sidebarLinks.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} className={navClass(item.match(location.pathname))}>
                {item.label}
              </Link>
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
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-secondary px-3 md:hidden"
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
                <Link to="/" className="btn-secondary px-3">
                  Home
                </Link>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn-secondary px-3"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="btn-secondary px-3"
                  >
                    {session?.user?.email?.split("@")[0] || "User"}
                  </button>

                  {userMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-elevated backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
                      <p className="rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-300">{session?.user?.email}</p>
                      <NavLink
                        to="/profile"
                        className="mt-1 block rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Profile
                      </NavLink>
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

          <main className="route-stage flex-1 px-4 py-5 md:px-6 md:py-6">
            <div key={location.pathname} className="route-transition">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
