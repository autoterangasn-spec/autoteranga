import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DaysBadgeProps {
  days: number;
  className?: string;
}

export function DaysBadge({ days, className }: DaysBadgeProps) {
  let variant: "destructive" | "warning" | "success" = "success";
  let label = `${days} jours`;

  if (days < 7) {
    variant = "destructive";
    label = `${days}j — Critique`;
  } else if (days < 15) {
    variant = "warning";
    label = `${days}j — Attention`;
  } else {
    label = `${days}j — OK`;
  }

  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  );
}
