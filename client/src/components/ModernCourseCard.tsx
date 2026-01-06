import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Users, Clock, Play, Lock, Sparkles, Gift } from "lucide-react";
import type { Course, User, CoursePlanPricing, SubscriptionPlan } from "@shared/schema";

type CourseWithDetails = Course & {
  instructor: User;
  enrollmentsCount: number;
  planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
  averageRating?: number;
  totalRatings?: number;
};

interface ModernCourseCardProps {
  course: CourseWithDetails;
  index?: number;
  onViewLessons?: () => void;
}

export function ModernCourseCard({ course, index = 0, onViewLessons }: ModernCourseCardProps) {
  const formatPrice = (price: string | null) => {
    if (!price || parseFloat(price) === 0) return "Bepul";
    return `${parseInt(price).toLocaleString()} so'm`;
  };

  const isNew = () => {
    if (!course.createdAt) return false;
    const createdDate = new Date(course.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const getDaysAgo = () => {
    if (!course.createdAt) return 0;
    const createdDate = new Date(course.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const hasDiscount = course.discountPercentage && course.discountPercentage > 0;
  const isFree = course.isFree;

  // Calculate discounted price
  const getDiscountedPrice = () => {
    if (!course.price || !course.discountPercentage) return course.price;
    const originalPrice = parseFloat(course.price);
    return String(Math.round(originalPrice * (1 - course.discountPercentage / 100)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={isFree ? "free-course-wrapper" : ""}
    >
      {/* Animated stars for free courses */}
      {isFree && (
        <>
          <span className="free-course-star">⭐</span>
          <span className="free-course-star">✨</span>
          <span className="free-course-star">⭐</span>
          <span className="free-course-star">✨</span>
        </>
      )}

      <Card 
        className={`group overflow-visible modern-card glow-border h-full flex flex-col ${
          isFree ? "border-amber-400/50 dark:border-amber-500/50 rainbow-glow" : ""
        } ${hasDiscount ? "glow-card" : ""}`}
        data-testid={`card-course-${course.id}`}
      >
        {/* Thumbnail Section */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full gradient-primary opacity-20" />
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                onViewLessons?.();
              }}
              data-testid={`button-view-lessons-${course.id}`}
            >
              <Play className="w-4 h-4" />
              Darslarni ko'rish
            </Button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isNew() && (
              <Badge className="bg-emerald-500 text-white border-0 shadow-lg">
                YANGI {getDaysAgo() === 0 ? "(Bugun)" : `(${getDaysAgo()} kun)`}
              </Badge>
            )}
            {hasDiscount && !isFree && (
              <Badge className="bg-rose-500 text-white border-0 shadow-lg">
                -{course.discountPercentage}% CHEGIRMA
              </Badge>
            )}
            {isFree && (
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg gap-1">
                <Gift className="w-3 h-3" />
                BEPUL
              </Badge>
            )}
          </div>

          {/* Category Badge */}
          {course.category && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 right-3 glass-strong text-xs"
            >
              {course.category}
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <CardContent className="flex-1 p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>

          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {course.author?.[0] || course.instructor?.firstName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {course.author || `${course.instructor?.firstName} ${course.instructor?.lastName}`}
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Rating */}
            {course.averageRating && course.averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">
                  {course.averageRating.toFixed(1)}
                </span>
                <span className="text-xs">({course.totalRatings})</span>
              </div>
            )}
            {/* Enrollments */}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrollmentsCount} o'quvchi</span>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}
        </CardContent>

        {/* Footer Section */}
        <CardFooter className="p-4 pt-0 flex items-center justify-between gap-4">
          {/* Price */}
          <div className="flex flex-col">
            {isFree ? (
              <span className="text-xl font-bold text-amber-500 flex items-center gap-1">
                <Sparkles className="w-5 h-5" />
                BEPUL
              </span>
            ) : hasDiscount ? (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(course.price)}
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(getDiscountedPrice())}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold">
                {formatPrice(course.price)}
              </span>
            )}
          </div>

          {/* CTA Button */}
          <Link href={`/courses/${course.id}`}>
            <Button 
              className={
                isFree 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600" 
                  : "gradient-primary text-white border-0"
              }
              data-testid={`button-enroll-${course.id}`}
            >
              {isFree ? "Darslarni Ko'rish" : "Kursga Yozilish"}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
