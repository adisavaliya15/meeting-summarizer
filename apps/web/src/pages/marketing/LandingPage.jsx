import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FileSearch,
  FileText,
  Lock,
  Mic,
  Rocket,
  ScanSearch,
  Shapes,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import auroraBlob from "../../assets/aurora-blob.svg";
import gridPattern from "../../assets/grid-pattern.svg";
import waveDivider from "../../assets/wave-divider.svg";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

const bentoItems = [
  {
    title: "Auto-split chunks",
    text: "Long recordings auto-divide into 10-minute chunks for reliable upload and processing.",
    icon: Mic,
    className: "md:col-span-2",
  },
  {
    title: "Searchable transcript",
    text: "Inspect every chunk transcript with timestamps and segment-level readability.",
    icon: ScanSearch,
    className: "md:col-span-2",
  },
  {
    title: "Action items + decisions",
    text: "Summaries extract decisions, actions, open questions, and topical coverage.",
    icon: ClipboardList,
    className: "md:col-span-2",
  },
  {
    title: "Final recap",
    text: "Generate one final summary from all processed chunk summaries.",
    icon: FileText,
    className: "md:col-span-3",
  },
  {
    title: "Export markdown",
    text: "Copy or export polished markdown notes for docs, PRDs, and async updates.",
    icon: FileSearch,
    className: "md:col-span-2",
  },
  {
    title: "Local processing privacy",
    text: "Use your own worker and models while Supabase stores durable state.",
    icon: Lock,
    className: "md:col-span-1",
  },
];

const steps = [
  {
    title: "Record",
    text: "Capture microphone with optional system audio and let Summora split chunks automatically.",
    icon: Mic,
  },
  {
    title: "Transcribe",
    text: "Worker transcribes each uploaded chunk and updates progress in your session timeline.",
    icon: ScanSearch,
  },
  {
    title: "Summarize",
    text: "Get structured takeaways per chunk and one final session recap ready to share.",
    icon: Sparkles,
  },
];

const testimonials = [
  {
    quote: "Summora turned one-hour sync calls into five-minute readouts. We stopped losing action items.",
    person: "Nina",
    role: "Product Operations",
  },
  {
    quote: "The chunk timeline makes long technical calls easy to review. Transcript readability is excellent.",
    person: "Arjun",
    role: "Engineering Lead",
  },
  {
    quote: "Final summaries are now our default handoff artifact after customer interviews.",
    person: "Mateo",
    role: "Research Team",
  },
  {
    quote: "Meeting notes are no longer a bottleneck. The structure keeps everyone aligned.",
    person: "Avery",
    role: "Customer Success",
  },
];

function TestimonialCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    onSelect();
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonials.map((item) => (
            <div key={item.person} className="min-w-0 flex-[0_0_100%] pr-4 md:flex-[0_0_50%]">
              <Card className="h-full p-6">
                <p className="text-base text-foreground">"{item.quote}"</p>
                <p className="mt-5 text-sm font-semibold text-foreground">{item.person}</p>
                <p className="text-sm text-muted">{item.role}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {testimonials.map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full transition-all ${selectedIndex === index ? "w-8 bg-primary" : "w-2 bg-border"}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={() => emblaApi?.scrollPrev()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => emblaApi?.scrollNext()}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ session }) {
  return (
    <div>
      <section className="relative overflow-hidden py-20 sm:py-24">
        <img src={gridPattern} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover opacity-40" />
        <img src={auroraBlob} alt="" aria-hidden="true" className="pointer-events-none absolute right-[-120px] top-[-120px] -z-10 w-[min(58vw,620px)] opacity-90" />

        <SectionContainer className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <Badge tone="brand">Summora for Teams</Badge>
            <h1 className="mt-5 max-w-3xl">Record meetings. Transcribe every chunk. Deliver clean summaries.</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Summora turns long conversations into searchable transcripts and structured takeaways in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={session ? "/dashboard" : "/login"}>
                <Button size="lg">
                  Start Free
                  <Rocket className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="outline" size="lg">View Product</Button>
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
            className="card card-bento p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Workspace preview</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-default bg-panel-2 p-3">
                <p className="text-sm font-semibold text-foreground">Chunk 03 transcript</p>
                <p className="mt-2 text-sm text-muted">[10:12 - 12:04] We decided to ship API key rotation this sprint...</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-default bg-panel-2 p-3">
                  <p className="text-sm font-semibold text-foreground">Action items</p>
                  <p className="mt-2 text-sm text-muted">4 follow-ups detected</p>
                </div>
                <div className="rounded-xl border border-default bg-panel-2 p-3">
                  <p className="text-sm font-semibold text-foreground">Decisions</p>
                  <p className="mt-2 text-sm text-muted">2 approved decisions</p>
                </div>
              </div>
              <div className="rounded-xl border border-default bg-panel-2 p-3">
                <p className="text-sm font-semibold text-foreground">Final recap readiness</p>
                <p className="mt-2 text-sm text-muted">6/6 chunks summarized</p>
              </div>
            </div>
          </motion.div>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <div className="mb-8 max-w-2xl">
            <h2>Built for meeting-heavy teams</h2>
            <p className="mt-3 text-base text-muted">Everything from recording to final recap in one clear workflow.</p>
          </div>

          <div className="bento-grid">
            {bentoItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className={`p-5 ${item.className}`}>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <div className="mb-8 max-w-2xl">
            <h2>How it works</h2>
            <p className="mt-3 text-base text-muted">From capture to recap in three consistent steps.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">Step {index + 1}</p>
                  <h3 className="mt-2">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.text}</p>
                </Card>
              );
            })}
          </div>
        </SectionContainer>
      </section>

      <section className="py-16">
        <SectionContainer>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2>Teams using Summora</h2>
              <p className="mt-2 text-sm text-muted">Static examples until public case studies are released.</p>
            </div>
            <Shapes className="h-5 w-5 text-primary" />
          </div>
          <TestimonialCarousel />
        </SectionContainer>
      </section>

      <section className="pb-20 pt-10">
        <SectionContainer>
          <Card className="aurora-block overflow-hidden p-8">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2>Turn any meeting into clarity</h2>
                <p className="mt-2 text-sm text-muted">Start free and turn recordings into decisions your team can move on.</p>
              </div>
              <Link to={session ? "/dashboard" : "/login"}>
                <Button size="lg">Start Free</Button>
              </Link>
            </div>
          </Card>
        </SectionContainer>
      </section>

      <img src={waveDivider} alt="" aria-hidden="true" className="pointer-events-none block h-auto w-full opacity-75 dark:opacity-35" />
    </div>
  );
}

