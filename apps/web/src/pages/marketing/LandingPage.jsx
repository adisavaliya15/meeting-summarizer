import { Link } from "react-router-dom";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

const FEATURES = [
  {
    title: "Continuous Chunk Recording",
    description: "Capture long meetings in browser with automatic chunk segmentation for reliable uploads.",
    icon: "R",
  },
  {
    title: "Fast Transcription Pipeline",
    description: "Each uploaded chunk is transcribed and attached to the session with clear status tracking.",
    icon: "T",
  },
  {
    title: "Structured AI Summaries",
    description: "Get action items, key points, decisions, questions, and topics in one consistent format.",
    icon: "S",
  },
  {
    title: "Final Session Brief",
    description: "Combine chunk summaries into one final overview to share with your team instantly.",
    icon: "F",
  },
  {
    title: "Privacy-First Processing",
    description: "Use local worker processing for transcription and summarization with your own infrastructure.",
    icon: "P",
  },
  {
    title: "Export Ready",
    description: "Copy or export markdown summaries from the app for docs, tickets, and async updates.",
    icon: "E",
  },
];

export default function LandingPage({ session }) {
  return (
    <div>
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-100/70 via-white to-emerald-50/70 dark:from-brand-950/40 dark:via-slate-950 dark:to-slate-900" />
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand">Summora for Teams</Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Record meetings. Transcribe every chunk. Deliver clean summaries.
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-300">
              Summora turns long conversations into searchable transcripts and structured takeaways, ready in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={session ? "/dashboard" : "/login"}>
                <Button variant="primary">Start Free</Button>
              </Link>
              <Link to="/product">
                <Button variant="outline">View Product</Button>
              </Link>
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Built for meeting-heavy teams</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Everything from capture to summary in one workflow.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
              </Card>
            ))}
          </div>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <Card className="grid gap-8 p-8 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Step 1</p>
              <h3 className="mt-2 text-xl font-semibold">Record</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Capture mic and optional system audio in browser.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Step 2</p>
              <h3 className="mt-2 text-xl font-semibold">Transcribe</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Worker processes each chunk into searchable transcript JSON.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Step 3</p>
              <h3 className="mt-2 text-xl font-semibold">Summarize</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Generate chunk summaries and one final session brief.</p>
            </div>
          </Card>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">What teams say</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["Product Ops", "Engineering", "Customer Success"].map((team) => (
              <Card key={team} className="p-5">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  "Summora reduced our post-meeting recap time and made action items clearer across the team."
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{team}</p>
              </Card>
            ))}
          </div>
        </SectionContainer>
      </section>

      <section className="pb-20 pt-8">
        <SectionContainer>
          <Card className="bg-gradient-to-r from-brand-600 to-brand-500 p-8 text-white dark:from-brand-700 dark:to-brand-600">
            <h2 className="text-2xl font-semibold">Ready to streamline your meeting notes?</h2>
            <p className="mt-2 text-sm text-brand-100">Start free, keep your current workflow, and ship better summaries.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={session ? "/dashboard" : "/login"}>
                <Button variant="secondary" className="border-white/40 bg-white text-brand-700 hover:bg-brand-50">
                  Start Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 dark:text-white">
                  See Pricing
                </Button>
              </Link>
            </div>
          </Card>
        </SectionContainer>
      </section>
    </div>
  );
}
