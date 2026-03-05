import { cva } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "../../lib/cn";

const buttonVariants = cva("ui-btn", {
  variants: {
    variant: {
      primary: "btn-primary",
      secondary: "btn-secondary",
      outline: "btn-outline",
      destructive: "btn-destructive",
      ghost: "btn-ghost",
    },
    size: {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-base",
      icon: "h-10 w-10 p-0",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

const Button = forwardRef(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { Button, buttonVariants };
export default Button;