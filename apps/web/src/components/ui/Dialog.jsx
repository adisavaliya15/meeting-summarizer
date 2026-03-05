import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogPortal({ children }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

export const DialogOverlay = ({ className, ...props }) => (
  <DialogPrimitive.Overlay
    className={cn("dialog-overlay", className)}
    {...props}
  />
);

export const DialogContent = ({ className, children, showClose = true, ...props }) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content className={cn("dialog-content", className)} {...props}>
      {children}
      {showClose ? (
        <DialogPrimitive.Close className="dialog-close" aria-label="Close">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
);

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("dialog-header", className)} {...props} />
);

export const DialogFooter = ({ className, ...props }) => (
  <div className={cn("dialog-footer", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn("dialog-title", className)} {...props} />
);

export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn("dialog-description", className)} {...props} />
);