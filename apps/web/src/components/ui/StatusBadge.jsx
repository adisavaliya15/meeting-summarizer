import Badge from "./Badge";

const MAP = {
  UPLOADED: "brand",
  TRANSCRIBED: "warning",
  SUMMARIZED: "success",
  FAILED: "danger",
};

export default function StatusBadge({ status }) {
  const tone = MAP[status] || "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}