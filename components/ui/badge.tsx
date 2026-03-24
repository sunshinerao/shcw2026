import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom variants for tracks
        institution: "border-transparent bg-sky-100 text-sky-700",
        economy: "border-transparent bg-violet-100 text-violet-700",
        foundation: "border-transparent bg-orange-100 text-orange-700",
        accelerator: "border-transparent bg-amber-100 text-amber-700",
        comprehensive: "border-transparent bg-amber-100 text-amber-700",
        // Event types
        forum: "border-transparent bg-blue-100 text-blue-700",
        workshop: "border-transparent bg-green-100 text-green-700",
        ceremony: "border-transparent bg-amber-100 text-amber-700",
        conference: "border-transparent bg-purple-100 text-purple-700",
        networking: "border-transparent bg-pink-100 text-pink-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
