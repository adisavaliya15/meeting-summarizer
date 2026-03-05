import { BadgeCheck, LogOut, Palette, Trash2, UserRound } from "lucide-react";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useTheme } from "../components/ui/ThemeProvider";

function DetailRow({ label, value }) {
  return (
    <div className="rounded-xl border border-default bg-panel-2 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

export default function ProfilePage({ session, onSignOut }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card className="p-7">
        <Badge tone="brand">Profile</Badge>
        <h1 className="mt-4 text-3xl">Account settings</h1>
        <p className="mt-2 text-sm text-muted">Manage your identity, appearance, and account actions.</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserRound className="h-4 w-4 text-primary" />
            Account details
          </div>
          <DetailRow label="Email" value={session?.user?.email} />
          <DetailRow label="Account ID" value={session?.user?.id} />
          <div className="inline-flex items-center gap-2 rounded-xl border border-default bg-panel-2 px-3 py-2 text-sm text-muted">
            <BadgeCheck className="h-4 w-4 text-success" />
            Authenticated with Supabase session
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3>Theme preference</h3>
              <p className="mt-1 text-sm text-muted">Current theme: {theme}</p>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              <Palette className="h-4 w-4" />
              Toggle theme
            </Button>
          </div>

          <div className="space-y-2 border-t border-default pt-5">
            <h3>Account actions</h3>
            <p className="text-sm text-muted">Sign out now or trigger account delete flow (UI placeholder).</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" onClick={onSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
