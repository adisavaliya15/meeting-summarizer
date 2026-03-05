import { AnimatePresence } from "framer-motion";
import { Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import PageTransition from "../motion/PageTransition";
import Footer from "../marketing/Footer";
import Button from "../ui/Button";
import SectionContainer from "../ui/SectionContainer";
import { useTheme } from "../ui/ThemeProvider";

function navItemClass({ isActive }) {
  return isActive
    ? "text-foreground font-semibold"
    : "text-muted hover:text-foreground transition-colors";
}

export default function PublicLayout({ session }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const authHref = session ? "/dashboard" : "/login";
  const authLabel = session ? "Dashboard" : "Start Free";

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-default bg-panel backdrop-blur-xl">
        <SectionContainer className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
              so
            </span>
            <span>Summora</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/product" className={navItemClass}>
              Product
            </NavLink>
            <NavLink to="/pricing" className={navItemClass}>
              Pricing
            </NavLink>
            <NavLink to="/contact" className={navItemClass}>
              Contact
            </NavLink>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Link to={authHref}>
              <Button size="sm">
                <Sparkles className="h-4 w-4" />
                {authLabel}
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-default bg-panel md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </SectionContainer>

        <AnimatePresence>
          {menuOpen ? (
            <PageTransition className="border-t border-default md:hidden">
              <SectionContainer className="space-y-2 py-3">
                <NavLink onClick={() => setMenuOpen(false)} to="/product" className="block rounded-xl px-3 py-2 text-muted hover:bg-panel-2">
                  Product
                </NavLink>
                <NavLink onClick={() => setMenuOpen(false)} to="/pricing" className="block rounded-xl px-3 py-2 text-muted hover:bg-panel-2">
                  Pricing
                </NavLink>
                <NavLink onClick={() => setMenuOpen(false)} to="/contact" className="block rounded-xl px-3 py-2 text-muted hover:bg-panel-2">
                  Contact
                </NavLink>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={toggleTheme}>
                    {theme === "dark" ? "Light" : "Dark"}
                  </Button>
                  <Link to={authHref} onClick={() => setMenuOpen(false)} className="flex-1">
                    <Button size="sm" className="w-full">
                      {authLabel}
                    </Button>
                  </Link>
                </div>
              </SectionContainer>
            </PageTransition>
          ) : null}
        </AnimatePresence>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname} className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
