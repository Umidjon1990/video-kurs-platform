import { Card, CardContent } from "@/components/ui/card";
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
  gradient?: string;
  iconBg?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  testId, 
  trend,
  gradient = "from-primary/10 via-primary/5 to-transparent",
  iconBg = "bg-primary/10"
}: StatsCardProps) {
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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card 
        data-testid={testId} 
        className={`h-full relative overflow-hidden border-0 shadow-lg bg-gradient-to-br ${gradient}`}
      >
        {/* Decorative circle */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-primary/5" />
        
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  className="text-4xl font-bold tracking-tight"
                  data-testid={testId ? `${testId}-value` : undefined}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  {value}
                </motion.span>
                {trend && (
                  <div className={`flex items-center text-xs font-medium ${trendColor}`} data-testid={testId ? `${testId}-trend` : undefined}>
                    <TrendIcon className="h-3 w-3 mr-1" />
                    {Math.abs(trend.value)}%
                  </div>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <motion.div 
              className={`p-3 rounded-2xl ${iconBg} shadow-lg`}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon className="h-6 w-6 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
