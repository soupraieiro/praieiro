import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CategoryBadgeProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function CategoryBadge({ icon: Icon, label, className }: CategoryBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}
