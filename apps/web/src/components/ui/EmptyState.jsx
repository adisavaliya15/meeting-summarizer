export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
      {description ? <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{description}</p> : null}
    </div>
  );
}
