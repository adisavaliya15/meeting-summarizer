export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
    </div>
  );
}