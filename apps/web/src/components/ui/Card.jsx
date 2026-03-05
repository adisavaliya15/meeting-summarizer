import { cva } from "class-variance-authority";

import { cn } from "../../lib/cn";

const cardVariants = cva("card", {
  variants: {
    variant: {
      default: "",
      panel: "panel",
      glass: "card-glass",
      bento: "card-bento",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export default function Card({ className, variant, padding, children, ...props }) {
  return (
    <section className={cn(cardVariants({ variant, padding }), className)} {...props}>
      {children}
    </section>
  );
}