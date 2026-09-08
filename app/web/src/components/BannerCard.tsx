import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

type BannerVariant = "default" | "destructive" | "warning" | "success"

const variantStyles: Record<BannerVariant, string> = {
  default: "bg-muted/50 border-muted-foreground/20",
  destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20 border-destructive/50 dark:border-destructive/20",
  warning: "bg-amber-500/10 border-amber-500/50 dark:bg-amber-500/20",
  success: "bg-emerald-500/10 border-emerald-500/50 dark:bg-emerald-500/20",
}

type BannerCardProps = {
  title: string
  description?: string
  variant?: BannerVariant
  action?: React.ReactNode
  className?: string
}

export function BannerCard({
  title,
  description,
  variant = "default",
  action,
  className,
}: BannerCardProps) {
  return (
    <Card
      className={cn(
        "shadow-none ring-0 border border-dashed py-3",
        variantStyles[variant],
        className,
      )}
    >
      <CardContent className="px-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold leading-tight">{title}</p>
          {description && (
            <p className="text-sm leading-tight">
              {description}
            </p>
          )}
        </div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </CardContent>
    </Card>
  )
}
