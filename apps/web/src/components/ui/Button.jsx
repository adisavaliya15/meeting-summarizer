const BASE =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT = {
  primary: "bg-brand-600 text-white hover:bg-brand-500 focus-visible:ring-brand-500",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  outline:
    "border border-brand-300 bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500 dark:border-brand-400/50 dark:text-brand-200 dark:hover:bg-brand-900/30",
  destructive:
    "border border-rose-300 bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500 dark:border-rose-500/40",
};

export default function Button({ type = "button", variant = "primary", className = "", ...props }) {
  return <button type={type} className={`${BASE} ${VARIANT[variant] || VARIANT.primary} ${className}`} {...props} />;
}
