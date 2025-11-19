import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
    >
      <Card data-testid={testId} className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
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
    </motion.div>
  );
}
