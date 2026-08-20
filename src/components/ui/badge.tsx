import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        "status-untreated":
          "border-transparent bg-status-untreated text-status-untreated-foreground [a&]:hover:bg-status-untreated/90",
        "status-attempting":
          "border-transparent bg-status-attempting text-status-attempting-foreground [a&]:hover:bg-status-attempting/90",
        "status-follow-up":
          "border-transparent bg-status-follow-up text-status-follow-up-foreground [a&]:hover:bg-status-follow-up/90",
        "status-treated":
          "border-transparent bg-status-treated text-status-treated-foreground [a&]:hover:bg-status-treated/90",
        "status-converted":
          "border-transparent bg-status-converted text-status-converted-foreground [a&]:hover:bg-status-converted/90",
        "status-not-reached":
          "border-transparent bg-status-not-reached text-status-not-reached-foreground [a&]:hover:bg-status-not-reached/90",
        "temperature-hot":
          "border-transparent bg-temperature-hot text-temperature-hot-foreground [a&]:hover:bg-temperature-hot/90",
        "temperature-warm":
          "border-transparent bg-temperature-warm text-temperature-warm-foreground [a&]:hover:bg-temperature-warm/90",
        "temperature-follow-up":
          "border-transparent bg-temperature-follow-up text-temperature-follow-up-foreground [a&]:hover:bg-temperature-follow-up/90",
        "temperature-cold":
          "border-transparent bg-temperature-cold text-temperature-cold-foreground [a&]:hover:bg-temperature-cold/90",
        "temperature-not-reached":
          "border-transparent bg-temperature-not-reached text-temperature-not-reached-foreground [a&]:hover:bg-temperature-not-reached/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
