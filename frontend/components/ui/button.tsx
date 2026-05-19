"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#0a0a0a] text-white shadow-sm hover:bg-[#1a1a1a] active:scale-[0.97]",
        secondary:
          "border border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#d4d4d4] active:scale-[0.97]",
        ghost:
          "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]",
        danger:
          "bg-[#0a0a0a] text-white hover:bg-black active:scale-[0.97]",
        outline:
          "border border-[#e5e5e5] bg-white text-[#0a0a0a] hover:bg-[#f5f5f5] hover:border-[#d4d4d4]",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-9 w-9 rounded-xl",
        "icon-sm": "h-7 w-7 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
