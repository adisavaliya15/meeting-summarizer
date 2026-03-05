import { cn } from "../../lib/cn";

export default function Skeleton({ className = "" }) {
  return <div className={cn("skeleton-shimmer", className)} />;
}