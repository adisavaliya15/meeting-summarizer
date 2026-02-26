const STYLE_MAP = {
  UPLOADED: "border border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/30 dark:text-sky-200",
  TRANSCRIBED:
    "border border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-200",
  SUMMARIZED:
    "border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  FAILED: "border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200",
};

export default function StatusBadge({ status }) {
  const resolved = STYLE_MAP[status] || STYLE_MAP.UPLOADED;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${resolved}`}>
      {status}
    </span>
  );
}