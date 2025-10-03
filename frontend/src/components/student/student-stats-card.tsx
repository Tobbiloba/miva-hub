import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { LucideIcon } from "lucide-react";

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
  accent = "blue"
}: StudentStatsCardProps) {
  const accentColors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400", 
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
    purple: "text-purple-600 dark:text-purple-400"
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
              <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
                {trend.isPositive ? "+" : ""}{trend.value}%
                {trend.text && ` ${trend.text}`}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}