import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useTheme } from "../components/ui/ThemeProvider";

export default function ProfilePage({ session, onSignOut }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Profile</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Account settings</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Manage identity, appearance, and account actions.</p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Email</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{session?.user?.email || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Account ID</p>
          <p className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">{session?.user?.id || "-"}</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Theme preference</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Current theme: {theme}</p>
          </div>
          <Button variant="secondary" onClick={toggleTheme}>
            Toggle Theme
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button variant="destructive">Delete account (UI only)</Button>
        </div>
      </Card>
    </div>
  );
}
