import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import SectionContainer from "../../components/ui/SectionContainer";

function MockPanel({ title, items }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProductPage() {
  return (
    <div className="py-16">
      <SectionContainer>
        <Badge tone="brand">Product</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Built for real meeting workflows</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-600 dark:text-slate-300">
          Summora is designed for long recordings, incremental processing, and readable outputs your team can act on.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <MockPanel title="Chunk Recording System" items={[
            "Browser recording with microphone and optional system audio",
            "Automatic 15-minute segmentation for reliable uploads",
            "Chunk status tracking from upload to completion",
          ]} />
          <MockPanel title="Transcript View" items={[
            "Structured transcript with segment timestamps",
            "Chunk-by-chunk transcript inspection in app",
            "Fast refresh as worker processing completes",
          ]} />
          <MockPanel title="Structured AI Summary" items={[
            "Summary, key points, action items, decisions",
            "Open questions and topics surfaced per chunk",
            "Formatted for easy team readout",
          ]} />
          <MockPanel title="Final Summary Export" items={[
            "Session-wide summary-of-summaries",
            "Copy and export markdown from UI",
            "Ready for docs, PRDs, and follow-ups",
          ]} />
        </div>

        <Card className="mt-8 p-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Local processing privacy by design</h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Worker transcription and summarization can run on your own machine and models, while Supabase keeps durable session state and storage.
          </p>
        </Card>
      </SectionContainer>
    </div>
  );
}
