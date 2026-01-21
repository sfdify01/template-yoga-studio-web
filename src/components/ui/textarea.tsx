import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-gray-300 placeholder:text-gray-400 focus-visible:border-brand focus-visible:ring-brand/20 aria-invalid:ring-red-500/20 aria-invalid:border-red-500 flex field-sizing-content min-h-16 w-full rounded-md border bg-white text-gray-900 px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
