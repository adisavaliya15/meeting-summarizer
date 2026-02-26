import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import Footer from "../marketing/Footer";
import Button from "../ui/Button";
import SectionContainer from "../ui/SectionContainer";
import { useTheme } from "../ui/ThemeProvider";

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;
}

export default function PublicLayout({ session }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <SectionContainer className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-brand-600 dark:text-brand-200">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">SO</span>
            Summora
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/product" className={navClass}>Product</NavLink>
            <NavLink to="/pricing" className={navClass}>Pricing</NavLink>
            <NavLink to="/contact" className={navClass}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            >
              Menu
            </button>

            <div className="hidden md:block">
              {session ? (
                <Link to="/dashboard">
                  <Button variant="primary">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="primary">Login</Button>
                </Link>
              )}
            </div>
          </div>
        </SectionContainer>

        {mobileNavOpen ? (
          <SectionContainer className="border-t border-slate-200 py-3 dark:border-slate-800 md:hidden">
            <div className="grid gap-1">
              <NavLink to="/product" className={navClass} onClick={() => setMobileNavOpen(false)}>
                Product
              </NavLink>
              <NavLink to="/pricing" className={navClass} onClick={() => setMobileNavOpen(false)}>
                Pricing
              </NavLink>
              <NavLink to="/contact" className={navClass} onClick={() => setMobileNavOpen(false)}>
                Contact
              </NavLink>

              <div className="pt-2">
                {session ? (
                  <Link to="/dashboard" onClick={() => setMobileNavOpen(false)}>
                    <Button variant="primary" className="w-full">Dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/login" onClick={() => setMobileNavOpen(false)}>
                    <Button variant="primary" className="w-full">Login</Button>
                  </Link>
                )}
              </div>
            </div>
          </SectionContainer>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
