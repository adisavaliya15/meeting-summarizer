export default function Card({ className = "", children }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 ${className}`}>{children}</section>;
}
