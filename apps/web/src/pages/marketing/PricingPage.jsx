import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

const personal = [
  "Chunk recording + upload",
  "Transcript + chunk summaries",
  "Final session summary export",
  "Local worker processing",
];

const pro = [
  "Everything in Personal",
  "Team workspaces",
  "Advanced retention controls",
  "Priority processing options",
];

const compareRows = [
  ["Chunk recording", "Included", "Included"],
  ["Transcript + chunk summary", "Included", "Included"],
  ["Final session recap", "Included", "Included"],
  ["Team collaboration", "-", "Planned"],
  ["Priority processing", "-", "Planned"],
];

function PlanCard({ name, price, description, features, cta, featured }) {
  return (
    <Card className={`p-6 ${featured ? "border-primary" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl">{name}</h3>
        {featured ? <Badge tone="brand">Coming soon</Badge> : null}
      </div>
      <p className="mt-3 text-4xl font-bold text-foreground">{price}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <ul className="mt-5 space-y-2">
        {features.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted">
            <Check className="mt-0.5 h-4 w-4 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Button variant={featured ? "outline" : "primary"} className="mt-6 w-full">
        {cta}
      </Button>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <div className="py-16">
      <SectionContainer>
        <Badge tone="brand">Pricing</Badge>
        <h1 className="mt-4 max-w-3xl">Simple plans for growing teams</h1>
        <p className="mt-3 text-base text-muted">Start free, validate your workflow, and move to collaborative controls later.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <PlanCard
            name="Personal"
            price="$0"
            description="For individual use and early testing"
            features={personal}
            cta="Start Free"
          />
          <PlanCard
            name="Pro"
            price="Coming soon"
            description="For teams that need collaboration and controls"
            features={pro}
            cta="Join Waitlist"
            featured
          />
        </div>

        <Card className="mt-8 overflow-hidden p-0">
          <div className="border-b border-default bg-panel-2 px-6 py-4">
            <h3>Feature comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-default text-left text-muted">
                  <th className="px-6 py-3 font-semibold">Feature</th>
                  <th className="px-6 py-3 font-semibold">Personal</th>
                  <th className="px-6 py-3 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row[0]} className="border-b border-default">
                    <td className="px-6 py-3 text-foreground">{row[0]}</td>
                    <td className="px-6 py-3 text-muted">{row[1]}</td>
                    <td className="px-6 py-3 text-muted">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3>Need custom support?</h3>
              <p className="text-sm text-muted">Contact us for implementation guidance.</p>
            </div>
          </div>
          <Link to="/contact">
            <Button variant="secondary">Contact sales</Button>
          </Link>
        </Card>
      </SectionContainer>
    </div>
  );
}
