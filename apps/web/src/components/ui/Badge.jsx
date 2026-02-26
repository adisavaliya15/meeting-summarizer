const TONE = {
  neutral: "badge badge-neutral",
  brand: "badge badge-brand",
  success: "badge badge-success",
  warning: "badge badge-warning",
};

export default function Badge({ tone = "neutral", className = "", children }) {
  return <span className={`${TONE[tone] || TONE.neutral} ${className}`.trim()}>{children}</span>;
}
