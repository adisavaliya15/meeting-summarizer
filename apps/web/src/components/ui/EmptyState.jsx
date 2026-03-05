import Card from "./Card";

export default function EmptyState({ title, description, action }) {
  return (
    <Card variant="glass" className="empty-state">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}