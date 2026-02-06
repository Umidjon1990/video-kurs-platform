import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, FileText, GraduationCap, ArrowRight, Trophy } from "lucide-react";
import type { StudentCourseProgress } from "@shared/schema";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface ProgressCardProps {
  progress: StudentCourseProgress;
  onContinue: (courseId: string, lessonId?: string) => void;
}

function AnimatedCircularProgress({ percentage, size = 64 }: { percentage: number; size?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animatedPercent / 100);

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    let frame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(Math.round(eased * percentage));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [percentage, isInView]);

  const getColor = () => {
    if (percentage === 100) return "text-green-500 dark:text-green-400";
    if (percentage >= 60) return "text-primary";
    if (percentage >= 30) return "text-amber-500 dark:text-amber-400";
    return "text-blue-500 dark:text-blue-400";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg ref={ref} className="transform -rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="5"
          fill="none"
          className="text-muted-foreground/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="5"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${getColor()} transition-all duration-300`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{animatedPercent}%</span>
      </div>
    </div>
  );
}

export function ProgressCard({ progress, onContinue }: ProgressCardProps) {
  const { 
    course, 
    totalLessons, 
    totalAssignments, 
    submittedAssignments,
    totalTests,
    completedTests,
    averageTestScore,
    averageAssignmentScore,
    progressPercentage,
    nextLesson
  } = progress;

  const isCompleted = progressPercentage === 100;

  const statItems = [
    { icon: BookOpen, label: "Darslar", testKey: "lessons", value: `${totalLessons}`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { icon: FileText, label: "Vazifalar", testKey: "assignments", value: `${submittedAssignments}/${totalAssignments}`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { icon: CheckCircle2, label: "Testlar", testKey: "tests", value: `${completedTests}/${totalTests}`, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
    { icon: GraduationCap, label: "O'rtacha", testKey: "avg-score", value: `${Math.round(((averageTestScore + averageAssignmentScore) / 2) * 10) / 10}%`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden h-full hover-elevate" data-testid={`progress-card-${course.id}`}>
        {isCompleted && (
          <div className="h-1 w-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
        )}
        {!isCompleted && progressPercentage > 0 && (
          <div className="h-1 w-full bg-muted">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CardTitle className="text-xl line-clamp-1" data-testid={`progress-course-title-${course.id}`}>
                  {course.title}
                </CardTitle>
                {isCompleted && (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    <Trophy className="w-3 h-3 mr-1" />
                    Tugallangan
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {course.description}
              </p>
            </div>
            <AnimatedCircularProgress 
              percentage={progressPercentage} 
              size={64}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {statItems.map(({ icon: StatIcon, label, testKey, value, color, bg }, idx) => (
              <motion.div
                key={testKey}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 + 0.2 }}
                className={`flex items-center gap-2 p-3 rounded-md ${bg}`}
              >
                <StatIcon className={`w-4 h-4 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium" data-testid={`progress-${testKey}-${course.id}`}>
                    {value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {nextLesson && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Keyingi dars:</p>
                  <p className="text-sm font-medium line-clamp-1" data-testid={`next-lesson-title-${course.id}`}>
                    {nextLesson.title}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onContinue(course.id, nextLesson.id)}
                  data-testid={`button-continue-${course.id}`}
                >
                  Davom etish
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {isCompleted && !nextLesson && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Tabriklaymiz! Kursni tugatdingiz
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onContinue(course.id)}
                  data-testid={`button-review-${course.id}`}
                >
                  Qayta ko'rish
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
