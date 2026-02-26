export default function Skeleton({ className = "" }) {
  return <div className={`skeleton-shimmer ${className}`.trim()} />;
}
