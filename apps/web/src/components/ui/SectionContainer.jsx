import { cn } from "../../lib/cn";

export default function SectionContainer({ className = "", children }) {
  return <div className={cn("section-container", className)}>{children}</div>;
}