import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-dark shadow-soft hover:shadow-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-soft hover:shadow-medium",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-soft hover:shadow-medium",
        glass: "glass text-foreground hover:bg-card/90 backdrop-blur-sm",
        navy: "bg-navy text-navy-foreground hover:bg-navy/90 shadow-soft hover:shadow-medium",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft hover:shadow-medium",
      },
      size: {
        default: "h-10 sm:h-11 px-4 sm:px-6 py-2",
        sm: "h-8 sm:h-9 rounded-lg px-3 sm:px-4",
        lg: "h-12 sm:h-13 rounded-lg px-6 sm:px-8 text-base",
        icon: "h-10 w-10 sm:h-11 sm:w-11",
        hero: "h-12 sm:h-14 rounded-lg px-6 sm:px-10 text-sm sm:text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
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
