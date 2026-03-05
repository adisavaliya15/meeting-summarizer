import { cva } from "class-variance-authority";

import { cn } from "../../lib/cn";

const badgeVariants = cva("badge", {
  variants: {
    tone: {
      neutral: "badge-neutral",
      brand: "badge-brand",
      success: "badge-success",
      warning: "badge-warning",
      danger: "badge-danger",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export default function Badge({ className, tone, children }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}