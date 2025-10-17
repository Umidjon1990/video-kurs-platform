import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  testId?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, description, testId, trend }: StatsCardProps) {
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend 
    ? (trend.isPositive === false 
        ? (trend.value >= 0 ? "text-destructive" : "text-success") 
        : (trend.value >= 0 ? "text-success" : "text-destructive"))
    : "";

  return (
    <Card data-testid={testId} className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold" data-testid={testId ? `${testId}-value` : undefined}>
            {value}
          </div>
          {trend && (
            <div className={`flex items-center text-xs font-medium ${trendColor}`} data-testid={testId ? `${testId}-trend` : undefined}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
