import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

function PlanCard({ name, price, description, features, cta, highlighted }) {
  return (
    <Card className={`p-6 ${highlighted ? "ring-2 ring-brand-500/40" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{name}</h3>
        {highlighted ? <Badge tone="brand">Coming soon</Badge> : null}
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{price}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
      <Button variant={highlighted ? "outline" : "primary"} className="mt-6 w-full">{cta}</Button>
    </Card>
  );
}

export default function PricingPage() {
  return (
    <div className="py-16">
      <SectionContainer>
        <Badge tone="brand">Pricing</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Simple plans for growing teams</h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">Start free and scale as your meeting volume grows.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <PlanCard
            name="Personal"
            price="$0"
            description="For individuals and early testing"
            features={[
              "Chunk recording + upload",
              "Transcript + chunk summaries",
              "Final session summary export",
              "Local worker processing",
            ]}
            cta="Start Free"
          />

          <PlanCard
            name="Pro"
            price="Coming soon"
            description="For teams that need collaboration and controls"
            features={[
              "Everything in Personal",
              "Team workspaces",
              "Advanced retention controls",
              "Priority processing options",
            ]}
            cta="Join Waitlist"
            highlighted
          />
        </div>
      </SectionContainer>
    </div>
  );
}
