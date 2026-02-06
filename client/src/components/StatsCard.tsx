import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion, useInView } from "framer-motion";

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
  iconColor?: string;
  delay?: number;
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, isInView]);

  return <span ref={ref}>{displayValue.toLocaleString('uz-UZ')}</span>;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  testId, 
  trend,
  gradient = "from-primary/10 via-primary/5 to-transparent",
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  delay = 0,
}: StatsCardProps) {
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend 
    ? (trend.isPositive === false 
        ? (trend.value >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400") 
        : (trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"))
    : "";

  const isNumericValue = typeof value === 'number';
  const displayValue = isNumericValue ? <AnimatedNumber value={value as number} /> : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card 
        data-testid={testId} 
        className={`h-full relative overflow-hidden border-0 shadow-lg bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-primary/5" />
        
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  className="text-3xl font-bold tracking-tight"
                  data-testid={testId ? `${testId}-value` : undefined}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
                >
                  {displayValue}
                </motion.span>
                {trend && (
                  <motion.div 
                    className={`flex items-center text-xs font-medium ${trendColor} px-1.5 py-0.5 rounded-md ${trend.value >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`} 
                    data-testid={testId ? `${testId}-trend` : undefined}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.4 }}
                  >
                    <TrendIcon className="h-3 w-3 mr-1" />
                    {Math.abs(trend.value)}%
                  </motion.div>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <motion.div 
              className={`p-3 rounded-2xl ${iconBg} shadow-sm`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: delay + 0.1, type: "spring", stiffness: 250 }}
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
