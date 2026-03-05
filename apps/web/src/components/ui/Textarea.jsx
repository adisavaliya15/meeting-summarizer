import { forwardRef } from "react";

import { cn } from "../../lib/cn";

const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("textarea-base", className)} {...props} />;
});

export default Textarea;