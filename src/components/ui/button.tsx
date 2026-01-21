import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-brand/30 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-hover",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-100",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
        ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-[44px] px-4 py-2 has-[>svg]:px-3",
        sm: "h-10 min-h-[40px] rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 min-h-[48px] rounded-md px-6 has-[>svg]:px-4",
        icon: "min-w-[44px] min-h-[44px] w-11 h-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
