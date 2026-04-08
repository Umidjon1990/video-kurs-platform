import { useEffect, useRef, useState } from "react";
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
  gradient?: string;
  iconBg?: string;
  iconColor?: string;
  borderColor?: string;
  glowColor?: string;
  delay?: number;
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayValue(value);
      return;
    }
    hasAnimated.current = true;
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span ref={ref}>{displayValue.toLocaleString('uz-UZ')}</span>;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  testId,
  trend,
  gradient = "from-violet-600/30 via-violet-900/20 to-transparent",
  iconBg = "bg-violet-500/20",
  iconColor = "text-violet-300",
  borderColor = "border-violet-500/40",
  delay = 0,
}: StatsCardProps) {
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend
    ? (trend.isPositive === false
        ? (trend.value >= 0 ? "text-red-400" : "text-emerald-400")
        : (trend.value >= 0 ? "text-emerald-400" : "text-red-400"))
    : "";

  const isNumericValue = typeof value === 'number';
  const displayValue = isNumericValue ? <AnimatedNumber value={value as number} /> : value;

  return (
    <div
      className="h-full group cursor-default"
      data-testid={testId}
    >
      <div
        className={`
          h-full relative overflow-hidden rounded-2xl
          bg-gradient-to-br ${gradient}
          border ${borderColor}
        `}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold tracking-[0.15em] uppercase text-white/50 truncate">
                {title}
              </p>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-3xl sm:text-4xl font-black tracking-tight text-white"
                  data-testid={testId ? `${testId}-value` : undefined}
                >
                  {displayValue}
                </span>

                {trend && (
                  <div
                    className={`flex items-center gap-1 text-xs font-bold ${trendColor} px-2 py-0.5 rounded-full bg-white/5 border border-white/10`}
                    data-testid={testId ? `${testId}-trend` : undefined}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(trend.value)}%
                  </div>
                )}
              </div>

              {description && (
                <p className="text-xs text-white/35 mt-1">{description}</p>
              )}
            </div>

            <div
              className={`shrink-0 p-3 sm:p-3.5 rounded-xl ${iconBg} border border-white/10`}
            >
              <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${iconColor}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
