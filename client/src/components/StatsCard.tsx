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
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="h-full group"
    >
      <Card 
        data-testid={testId} 
        className={`h-full relative overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br ${gradient} backdrop-blur-xl rounded-[2rem] transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-primary/20`}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
        
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-400 tracking-wider uppercase">{title}</p>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  className="text-4xl font-black tracking-tight text-white drop-shadow-md"
                  data-testid={testId ? `${testId}-value` : undefined}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
                >
                  {displayValue}
                </motion.span>
                {trend && (
                  <motion.div 
                    className={`flex items-center text-xs font-bold ${trendColor} px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'} border border-white/5`} 
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
                <p className="text-xs font-medium text-slate-500">
                  {description}
                </p>
              )}
            </div>
            <motion.div 
              className={`p-4 rounded-2xl ${iconBg} shadow-inner border border-white/10`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: delay + 0.1, type: "spring", stiffness: 250 }}
              whileHover={{ rotate: 12, scale: 1.1 }}
            >
              <Icon className={`h-7 w-7 ${iconColor} drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]`} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
