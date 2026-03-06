import { useEffect, useRef, useState } from "react";
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
  borderColor?: string;
  glowColor?: string;
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
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
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
  gradient = "from-violet-600/30 via-violet-900/20 to-transparent",
  iconBg = "bg-violet-500/20",
  iconColor = "text-violet-300",
  borderColor = "border-violet-500/40",
  glowColor = "rgba(139,92,246,0.4)",
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
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.25 } }}
      className="h-full group cursor-default"
      data-testid={testId}
    >
      <div
        className={`
          h-full relative overflow-hidden rounded-2xl
          bg-gradient-to-br ${gradient}
          border ${borderColor}
          backdrop-blur-xl
          transition-all duration-300
          group-hover:border-opacity-70
        `}
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 4px 32px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {/* 3D top sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Glow blob */}
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
          style={{ background: glowColor }}
        />

        {/* Bottom reflection */}
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-20"
          style={{ background: glowColor }}
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-bold tracking-[0.15em] uppercase text-white/50 truncate">
                {title}
              </p>

              <div className="flex items-baseline gap-2 flex-wrap">
                <motion.span
                  className="text-3xl sm:text-4xl font-black tracking-tight"
                  style={{
                    color: '#fff',
                    textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, 0 2px 4px rgba(0,0,0,0.8)`,
                    WebkitTextStroke: '0.3px rgba(255,255,255,0.2)',
                  }}
                  data-testid={testId ? `${testId}-value` : undefined}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.2, type: "spring", stiffness: 260, damping: 20 }}
                >
                  {displayValue}
                </motion.span>

                {trend && (
                  <motion.div
                    className={`flex items-center gap-1 text-xs font-bold ${trendColor} px-2 py-0.5 rounded-full bg-white/5 border border-white/10`}
                    data-testid={testId ? `${testId}-trend` : undefined}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.4 }}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(trend.value)}%
                  </motion.div>
                )}
              </div>

              {description && (
                <p className="text-xs text-white/35 mt-1">{description}</p>
              )}
            </div>

            {/* Icon box with 3D effect */}
            <motion.div
              className={`shrink-0 p-3 sm:p-3.5 rounded-xl ${iconBg} border border-white/10`}
              style={{
                boxShadow: `0 0 16px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)`,
              }}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: delay + 0.1, type: "spring", stiffness: 280, damping: 18 }}
              whileHover={{ rotate: 10, scale: 1.15 }}
            >
              <Icon
                className={`h-6 w-6 sm:h-7 sm:w-7 ${iconColor}`}
                style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom progress bar shimmer */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: delay + 0.5, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
