import {
  AudioLines,
  Download,
  FileCheck2,
  Layers,
  Shield,
  Sparkles,
  TimerReset,
} from "lucide-react";

import auroraBlob from "../../assets/aurora-blob.svg";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

const highlights = [
  {
    title: "Chunk recording system",
    description: "Record in browser, split every 10 minutes, and upload safely in sequence.",
    icon: AudioLines,
    points: [
      "Microphone + optional system audio",
      "Automatic chunking for long sessions",
      "Reliable upload state tracking",
    ],
  },
  {
    title: "Readable transcript view",
    description: "Inspect transcripts as readable blocks with segment timestamps and search controls.",
    icon: Layers,
    points: [
      "Chunk-by-chunk inspection",
      "Timestamped segments in timeline order",
      "Progress visibility while processing",
    ],
  },
  {
    title: "Structured AI summaries",
    description: "Each chunk summary includes key points, action items, decisions, and open questions.",
    icon: Sparkles,
    points: [
      "Consistent summary schema",
      "Bento cards for readable output",
      "Copy and markdown export actions",
    ],
  },
  {
    title: "Final recap export",
    description: "Generate a session-wide summary-of-summaries and share in docs instantly.",
    icon: Download,
    points: [
      "Final summary with key takeaways",
      "Action items and risks surfaced",
      "Markdown export for workflows",
    ],
  },
];

function MockShot({ title, lines }) {
  return (
    <Card variant="glass" className="p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <div key={line} className="rounded-lg border border-default bg-panel-2 px-3 py-2 text-sm text-muted">
            {line}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProductPage() {
  return (
    <div className="py-16">
      <SectionContainer className="relative">
        <img src={auroraBlob} alt="" aria-hidden="true" className="pointer-events-none absolute right-0 top-[-80px] -z-10 w-[min(48vw,560px)] opacity-80" />

        <Badge tone="brand">Product</Badge>
        <h1 className="mt-4 max-w-4xl">Built for real meeting workflows and long recording sessions.</h1>
        <p className="mt-4 max-w-3xl text-base text-muted">
          Summora is designed for incremental processing and highly readable outputs your team can act on without rewatching full calls.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {highlights.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Feature spotlight</p>
            <h2 className="mt-3 text-2xl">Readable transcript + summary workspace</h2>
            <p className="mt-3 text-sm text-muted">
              The session detail interface keeps recorder state, chunk timeline, transcript review, and summary actions in one place.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MockShot
                title="Transcript panel"
                lines={[
                  "[02:13 - 03:02] Discussed OAuth migration",
                  "Decision: replace legacy MD5 flow",
                  "Action: document API auth rollout",
                ]}
              />
              <MockShot
                title="Summary panel"
                lines={[
                  "Key points: 6",
                  "Action items: 3",
                  "Open questions: 1",
                ]}
              />
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <TimerReset className="h-5 w-5" />
            </div>
            <h3>Auto 10-minute chunking</h3>
            <p className="text-sm text-muted">Long recordings are split automatically and uploaded as durable chunk jobs.</p>

            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3>Structured final recap</h3>
            <p className="text-sm text-muted">Finalized sessions compile all chunk summaries into one clear report.</p>

            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <h3>Local processing privacy</h3>
            <p className="text-sm text-muted">Transcription and summarization can run on your own worker infrastructure.</p>
          </Card>
        </div>
      </SectionContainer>
    </div>
  );
}

