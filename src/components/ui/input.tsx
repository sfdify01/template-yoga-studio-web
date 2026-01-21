import * as React from "react";

import { cn } from "./utils";

interface InputProps extends React.ComponentProps<"input"> {
  /** Left padding in pixels - use when you have a prefix icon */
  paddingLeft?: number;
  /** Right padding in pixels - use when you have a suffix icon */
  paddingRight?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, paddingLeft, paddingRight, style, ...props }, ref) => {
    // Default padding is 12px (equivalent to px-3), override with props
    const finalPaddingLeft = paddingLeft ?? 12;
    const finalPaddingRight = paddingRight ?? 12;

    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-gray-400 selection:bg-primary selection:text-primary-foreground flex h-11 min-h-[44px] w-full min-w-0 rounded-md border border-gray-300 py-1 text-base text-gray-900 bg-white transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-brand focus-visible:ring-brand/20 focus-visible:ring-[3px]",
          "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
          className,
        )}
        style={{
          paddingLeft: `${finalPaddingLeft}px`,
          paddingRight: `${finalPaddingRight}px`,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
