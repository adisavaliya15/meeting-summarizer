import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import PageTransition from "../motion/PageTransition";
import Button from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { useTheme } from "../ui/ThemeProvider";

function routeMeta(pathname) {
  if (pathname.startsWith("/sessions/")) {
    return {
      title: "Session Detail",
      breadcrumb: ["Workspace", "Sessions", "Detail"],
    };
  }
  if (pathname === "/sessions") {
    return {
      title: "Sessions",
      breadcrumb: ["Workspace", "Sessions"],
    };
  }
  if (pathname === "/notes") {
    return {
      title: "Manual Notes",
      breadcrumb: ["Workspace", "Notes"],
    };
  }
  if (pathname === "/profile") {
    return {
      title: "Profile",
      breadcrumb: ["Workspace", "Profile"],
    };
  }
  return {
    title: "Dashboard",
    breadcrumb: ["Workspace", "Dashboard"],
  };
}

export default function AppLayout({ session, onSignOut }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/notes", label: "Notes", icon: FileText },
      { to: "/sessions", label: "Sessions", icon: ListChecks },
      { to: "/profile", label: "Profile", icon: UserCircle },
    ],
    [],
  );

  const meta = routeMeta(location.pathname);

  return (
    <div className="min-h-screen text-foreground">
      <div className="flex min-h-screen">
        <motion.aside
          animate={{ width: collapsed ? 92 : 248 }}
          transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          className={`fixed inset-y-0 left-0 z-40 border-r border-default bg-panel backdrop-blur-xl ${mobileOpen ? "translate-x-0" : "-translate-x-full"} transition-transform md:translate-x-0`}
        >
          <div className="flex h-full flex-col px-4 py-5">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                so
              </span>
              <AnimatePresence>
                {!collapsed ? (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="text-xl font-bold"
                  >
                    Summora
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>

            <nav className="mt-8 grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted hover:bg-panel-2 hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <AnimatePresence>
                      {!collapsed ? (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                        >
                          {item.label}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                onClick={() => setCollapsed((prev) => !prev)}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                {!collapsed ? "Collapse" : null}
              </Button>
            </div>
          </div>
        </motion.aside>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          />
        ) : null}

        <div className={`flex min-w-0 flex-1 flex-col ${collapsed ? "md:pl-[92px]" : "md:pl-[248px]"}`}>
          <header className="sticky top-0 z-20 border-b border-default bg-panel px-4 py-3 backdrop-blur-xl md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="secondary" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="truncate text-xs uppercase tracking-[0.2em] text-muted">{meta.breadcrumb.join(" | ")}</p>
                  <h2 className="truncate text-lg font-semibold">{meta.title}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/">
                  <Button variant="secondary" size="sm">Home</Button>
                </Link>
                <Button variant="secondary" size="sm" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="max-w-[180px] truncate">
                      {session?.user?.email?.split("@")[0] || "User"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/notes">Notes</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        onSignOut();
                      }}
                      className="text-danger"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}