import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, FileText, GraduationCap, ArrowRight, Trophy } from "lucide-react";
import type { StudentCourseProgress } from "@shared/schema";
import { motion } from "framer-motion";

interface ProgressCardProps {
  progress: StudentCourseProgress;
  onContinue: (courseId: string, lessonId?: string) => void;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden h-full hover-elevate" data-testid={`progress-card-${course.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
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
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted-foreground/20 dark:text-muted-foreground/30"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                  className="text-primary dark:text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground" data-testid={`progress-percentage-${course.id}`}>
                  {progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <BookOpen className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Darslar</p>
              <p className="text-sm font-medium" data-testid={`progress-lessons-${course.id}`}>
                {totalLessons}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <FileText className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Vazifalar</p>
              <p className="text-sm font-medium" data-testid={`progress-assignments-${course.id}`}>
                {submittedAssignments}/{totalAssignments}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Testlar</p>
              <p className="text-sm font-medium" data-testid={`progress-tests-${course.id}`}>
                {completedTests}/{totalTests}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <GraduationCap className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">O'rtacha</p>
              <p className="text-sm font-medium" data-testid={`progress-avg-score-${course.id}`}>
                {Math.round(((averageTestScore + averageAssignmentScore) / 2) * 10) / 10}%
              </p>
            </div>
          </div>
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
        
        {/* Linear Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Umumiy progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
