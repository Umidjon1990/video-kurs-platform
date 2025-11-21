import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Users } from "lucide-react";
import type { Course, CoursePlanPricing, SubscriptionPlan } from "@shared/schema";
import { motion } from "framer-motion";
import { StarRating } from "@/components/StarRating";

interface CourseCardProps {
  course: Course & { 
    instructor?: { firstName?: string; lastName?: string };
    planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
    averageRating?: number;
    totalRatings?: number;
    enrollmentsCount?: number;
  };
  onEnroll?: (courseId: string) => void;
  onViewDemo?: (courseId: string) => void;
  isEnrolled?: boolean;
  index?: number;
}

export function CourseCard({ course, onEnroll, onViewDemo, isEnrolled, index = 0 }: CourseCardProps) {
  const instructorName = course.instructor 
    ? `${course.instructor.firstName || ''} ${course.instructor.lastName || ''}`.trim() || 'O\'qituvchi'
    : 'O\'qituvchi';
  
  const discountPercent = (course as any).discountPercentage && (course as any).discountPercentage > 0 
    ? (course as any).discountPercentage 
    : 0;
  const basePrice = Number(course.price);
  const displayPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;
  
  const isNew = course.createdAt 
    ? (Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 7 
    : false;
  const daysAgo = course.createdAt 
    ? Math.floor((Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;
  
  const gradients = [
    "from-blue-500 via-purple-500 to-pink-500",
    "from-green-500 via-teal-500 to-cyan-500",
    "from-orange-500 via-red-500 to-pink-500",
    "from-indigo-500 via-purple-500 to-fuchsia-500",
    "from-emerald-500 via-green-500 to-teal-500",
    "from-amber-500 via-orange-500 to-red-500",
  ];
  const gradient = gradients[index % gradients.length];

  const averageRating = course.averageRating ?? 5.0;
  const totalRatings = course.totalRatings ?? 0;
  const enrollmentsCount = course.enrollmentsCount ?? 0;

  const cardHeader = (
    <CardHeader className="p-0 relative overflow-hidden">
      {isNew && (
        <div className="absolute top-0 left-0 z-20 overflow-hidden w-32 h-32">
          <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-35px] top-[25px] w-[170px] shadow-md">
            <div className="text-xs">
              YANGI
              {daysAgo === 0 ? " (Bugun)" : ` (${daysAgo} kun)`}
            </div>
          </div>
        </div>
      )}
      {discountPercent > 0 && (
        <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-sm font-bold px-3 py-1">
          -{discountPercent}% CHEGIRMA
        </Badge>
      )}
      {course.thumbnailUrl ? (
        <div className="relative group">
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center rounded-t-lg">
          <BookOpen className="w-16 h-16 text-primary" />
        </div>
      )}
      {course.category && (
        <Badge className="absolute bottom-3 left-3 bg-background/90 backdrop-blur">
          {course.category}
        </Badge>
      )}
    </CardHeader>
  );

  const cardContent = (
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
        <div className="flex items-center gap-3 pt-1">
          <StarRating rating={averageRating} size={16} showValue={false} className="text-amber-400" />
          <span className="text-xs text-muted-foreground">({totalRatings})</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs">{enrollmentsCount}</span>
          </div>
        </div>
      </div>
    </CardContent>
  );

  const cardFooter = (
    <CardFooter className="p-4 pt-0 flex flex-col gap-3">
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
            {discountPercent > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
                    {displayPrice.toLocaleString('uz-UZ')} so'm
                  </span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" data-testid={`badge-discount-${course.id}`}>
                    {discountPercent}% chegirma
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground line-through">
                  {basePrice.toLocaleString('uz-UZ')} so'm
                </span>
              </>
            ) : (
              <div className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
                {basePrice.toLocaleString('uz-UZ')} so'm
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
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      {discountPercent > 0 ? (
        <div className={`p-1 bg-gradient-to-br ${gradient} rounded-lg h-full`}>
          <Card className="hover-elevate h-full flex flex-col overflow-hidden border-0" data-testid={`card-course-${course.id}`}>
            {cardHeader}
            {cardContent}
            {cardFooter}
          </Card>
        </div>
      ) : (
        <Card className="hover-elevate h-full flex flex-col overflow-hidden" data-testid={`card-course-${course.id}`}>
          {cardHeader}
          {cardContent}
          {cardFooter}
        </Card>
      )}
    </motion.div>
  );
}
