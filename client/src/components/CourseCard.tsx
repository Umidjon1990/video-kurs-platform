import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Play } from "lucide-react";
import type { Course, CoursePlanPricing, SubscriptionPlan } from "@shared/schema";

interface CourseCardProps {
  course: Course & { 
    instructor?: { firstName?: string; lastName?: string };
    planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
  };
  onEnroll?: (courseId: string) => void;
  onViewDemo?: (courseId: string) => void;
  isEnrolled?: boolean;
}

export function CourseCard({ course, onEnroll, onViewDemo, isEnrolled }: CourseCardProps) {
  const instructorName = course.instructor 
    ? `${course.instructor.firstName || ''} ${course.instructor.lastName || ''}`.trim() || 'O\'qituvchi'
    : 'O\'qituvchi';

  return (
    <Card className="hover-elevate h-full flex flex-col" data-testid={`card-course-${course.id}`}>
      <CardHeader className="p-0">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2" data-testid={`text-course-title-${course.id}`}>
              {course.title}
            </h3>
            {isEnrolled && (
              <Badge variant="secondary" data-testid={`badge-enrolled-${course.id}`}>
                Harid qilingan
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground" data-testid={`text-instructor-${course.id}`}>
            {instructorName}
          </p>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col gap-3">
        {/* Pricing by Plan */}
        {course.planPricing && course.planPricing.length > 0 ? (
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Tariflar:</p>
            <div className="grid gap-1.5">
              {course.planPricing.map((pricing) => (
                <div 
                  key={pricing.id} 
                  className="flex items-center justify-between text-sm"
                  data-testid={`pricing-${course.id}-${pricing.plan.name}`}
                >
                  <span className="text-muted-foreground">{pricing.plan.displayName}</span>
                  <span className="font-semibold text-primary">
                    {Number(pricing.price).toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-1">
              {course.originalPrice && course.discountedPrice ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
                      {Number(course.discountedPrice).toLocaleString('uz-UZ')} so'm
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700" data-testid={`badge-discount-${course.id}`}>
                      {Math.round(((parseFloat(course.originalPrice) - parseFloat(course.discountedPrice)) / parseFloat(course.originalPrice)) * 100)}% chegirma
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground line-through">
                    {Number(course.originalPrice).toLocaleString('uz-UZ')} so'm
                  </span>
                </>
              ) : (
                <div className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
                  {Number(course.price).toLocaleString('uz-UZ')} so'm
                </div>
              )}
            </div>
          </div>
        )}
        {onEnroll && !isEnrolled && (
          <Button 
            onClick={() => onEnroll(course.id)}
            className="w-full"
            data-testid={`button-enroll-${course.id}`}
          >
            Sotib olish
          </Button>
        )}
        {onViewDemo && (
          <Button 
            variant="outline"
            className="w-full"
            onClick={() => onViewDemo(course.id)}
            data-testid={`button-view-demo-${course.id}`}
          >
            <Play className="w-4 h-4 mr-2" />
            Sinov darsi ko'rish
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
