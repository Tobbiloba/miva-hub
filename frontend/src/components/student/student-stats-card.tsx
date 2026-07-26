import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

interface StudentStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    text?: string;
  };
  accent?: "blue" | "green" | "orange" | "red" | "purple";
}

export function StudentStatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accent = "blue",
}: StudentStatsCardProps) {
  const accentColors = {
    blue: "text-primary",
    green: "text-emerald-600 dark:text-emerald-400",
    orange: "text-amber-600 dark:text-amber-400",
    red: "text-destructive",
    purple: "text-primary",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${accentColors[accent]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={
                  trend.isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%{trend.text && ` ${trend.text}`}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
