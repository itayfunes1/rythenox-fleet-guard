import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "online" | "idle" | "offline" | "active" | "degraded";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium capitalize gap-1.5",
        status === "online" || status === "active"
          ? "border-success/30 bg-success/10 text-success"
          : status === "idle" || status === "degraded"
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "online" || status === "active"
            ? "bg-success"
            : status === "idle" || status === "degraded"
            ? "bg-warning"
            : "bg-destructive"
        )}
      />
      {status}
    </Badge>
  );
}
