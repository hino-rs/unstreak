import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href?: string
  onClickCta?: () => void
  cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full h-full grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  onClickCta,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/30 h-full",
      "dark:bg-card dark:border-border/60",
      className
    )}
    {...props}
  >
    {/* 1. Header (Icon, Name, Description) at top */}
    <div className="relative z-10 flex flex-col gap-0.5 shrink-0">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-4" />
        </div>
        <h3 className="text-base font-bold text-foreground truncate">
          {name}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
    </div>

    {/* 2. Middle visual content (placed between description and cta) */}
    <div className="relative z-0 my-2 flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
      {background}
    </div>

    {/* 3. Footer CTA link at bottom */}
    <div className="relative z-10 flex items-center justify-between pt-1.5 border-t border-border/40 mt-auto shrink-0">
      {onClickCta ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onClickCta}
          className="pointer-events-auto p-0 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center group/btn h-auto py-0 cursor-pointer"
        >
          <span>{cta}</span>
          <ArrowRightIcon className="ms-1.5 size-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </Button>
      ) : (
        <Button
          variant="link"
          size="sm"
          className="pointer-events-auto p-0 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center group/btn h-auto py-0 cursor-pointer"
          render={<a href={href || "#"} />}
          nativeButton={false}
        >
          <span>{cta}</span>
          <ArrowRightIcon className="ms-1.5 size-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </Button>
      )}
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-primary/2" />
  </div>
)

export { BentoCard, BentoGrid }


