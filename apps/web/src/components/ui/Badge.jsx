const TONE = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  brand: "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-900/30 dark:text-brand-200",
  success: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  warning: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200",
};

export default function Badge({ tone = "neutral", className = "", children }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE[tone] || TONE.neutral} ${className}`}>{children}</span>;
}
