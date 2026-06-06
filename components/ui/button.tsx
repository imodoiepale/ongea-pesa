import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — active:scale-[0.97] simulates physical press (spring physics)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 active:scale-[0.97]",
  {
    variants: {
      variant: {
        /* Brand green — propagates as the new default everywhere */
        default:
          "bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 active:bg-brand/80",

        /* Destructive — unchanged */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",

        /* Outline — hairline border, legible on both surfaces */
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

        /* Secondary */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",

        /* Ghost */
        ghost: "hover:bg-accent hover:text-accent-foreground",

        /* Link */
        link: "text-primary underline-offset-4 hover:underline",

        /* Voice — neon glass for .surface-voice screens */
        voice:
          "bg-[rgba(0,255,136,0.12)] text-[hsl(var(--voice-accent))] border border-[rgba(0,255,136,0.25)] hover:bg-[rgba(0,255,136,0.2)] hover:border-[rgba(0,255,136,0.4)] backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,136,0.15)]",

        /* Glass — frosted glass for overlays on voice/hero screens */
        glass:
          "bg-white/8 text-white border border-white/12 hover:bg-white/15 hover:border-white/20 backdrop-blur-sm",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
