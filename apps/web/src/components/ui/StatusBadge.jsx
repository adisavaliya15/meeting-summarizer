const STYLE_MAP = {
  UPLOADED: "status-badge status-uploaded",
  TRANSCRIBED: "status-badge status-transcribed",
  SUMMARIZED: "status-badge status-summarized",
  FAILED: "status-badge status-failed",
};

export default function StatusBadge({ status }) {
  const resolved = STYLE_MAP[status] || STYLE_MAP.UPLOADED;
  return <span className={resolved}>{status}</span>;
}
