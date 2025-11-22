import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, BookOpen, Users, Award, Star, Mail, Phone, MapPin, Send, ExternalLink, X, ZoomIn, Play, Lock, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import type { Course, User, SiteSetting, Testimonial, CoursePlanPricing, SubscriptionPlan } from "@shared/schema";

type PublicCourse = Course & {
  instructor: User;
  enrollmentsCount: number;
  planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
  averageRating?: number;
  totalRatings?: number;
};

type Lesson = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  isDemo: boolean;
  duration?: number;
  order: number;
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<{ url: string; index: number } | null>(null);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<PublicCourse | null>(null);
  const [selectedDemoLesson, setSelectedDemoLesson] = useState<Lesson | null>(null);

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    
    if (priceRange === "free") {
      params.append("minPrice", "0");
      params.append("maxPrice", "0");
    } else if (priceRange === "0-100") {
      params.append("minPrice", "1");
      params.append("maxPrice", "100000");
    } else if (priceRange === "100-300") {
      params.append("minPrice", "100000");
      params.append("maxPrice", "300000");
    } else if (priceRange === "300+") {
      params.append("minPrice", "300000");
    }
    
    return params.toString();
  };

  const queryString = buildQueryParams();
  const { data: courses, isLoading } = useQuery<PublicCourse[]>({
    queryKey: [`/api/courses/public${queryString ? `?${queryString}` : ''}`],
  });
  
  // DEBUG: Log courses data
  console.log('[HomePage Debug]', { 
    isLoading, 
    coursesExists: !!courses, 
    coursesLength: courses?.length,
    courses 
  });

  // Fetch site settings
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
  });

  // Fetch testimonials
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  // Fetch lessons for selected course
  const { data: courseLessons } = useQuery<Lesson[]>({
    queryKey: selectedCourseForLessons 
      ? [`/api/courses/${selectedCourseForLessons.id}/lessons/public`]
      : [],
    enabled: !!selectedCourseForLessons,
  });

  // Helper to get setting value
  const getSetting = (key: string) => {
    return siteSettings?.find(s => s.key === key)?.value || "";
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const formatPrice = (price: string | null) => {
    if (!price || parseFloat(price) === 0) return "Bepul";
    return `${parseInt(price).toLocaleString()} so'm`;
  };

  const calculateDiscount = (original: string | null, discounted: string | null) => {
    if (!original || !discounted) return null;
    const origPrice = parseFloat(original);
    const discPrice = parseFloat(discounted);
    if (origPrice <= discPrice) return null;
    return Math.round(((origPrice - discPrice) / origPrice) * 100);
  };

  const categories = [
    { value: "", label: "Barcha kategoriyalar" },
    { value: "IT", label: "💻 Dasturlash" },
    { value: "Design", label: "🎨 Dizayn" },
    { value: "Business", label: "📈 Biznes" },
    { value: "Til", label: "🌍 Tillar" },
    { value: "Marketing", label: "📢 Marketing" },
  ];

  const priceRanges = [
    { value: "", label: "Barcha narxlar" },
    { value: "free", label: "Bepul" },
    { value: "0-100", label: "0 - 100,000" },
    { value: "100-300", label: "100,000 - 300,000" },
    { value: "300+", label: "300,000+" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <motion.div 
        className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b"
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,0,0,0.1),transparent)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold" 
              data-testid="text-hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
             Zamonaviy Ta'lim
              <br />
              <span className="text-primary">Video Kurslar Platformasi</span>
            </motion.h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Professional  zamonaviy video darslar.
              <br />
              Bilimingizni oshiring va kelajagingizni yarating!
            </motion.p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Kurs qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <Card className="mt-4 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Kategoriya</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border bg-background"
                        data-testid="select-category"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Narx</label>
                      <select
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border bg-background"
                        data-testid="select-price"
                      >
                        {priceRanges.map((range) => (
                          <option key={range.value} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation("/login")}
                data-testid="button-get-started"
              >
                Kirish
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setSearchQuery("")}
                data-testid="button-explore"
              >
                Kurslarni Ko'rish
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Mavjud Kurslar</h2>
          <p className="text-muted-foreground">
            {courses?.length || 0} ta kurs topildi
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-56 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => {
              // Discount calculation
              const discountPercent = course.discountPercentage && course.discountPercentage > 0 ? course.discountPercentage : 0;
              const basePrice = Number(course.price);
              const displayPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;
              
              // "Yangi" ribbon calculation - 7 kun ichida
              const isNew = course.createdAt ? (Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 7 : false;
              const daysAgo = course.createdAt ? Math.floor((Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              
              // Gradient palette (6 modern gradients)
              const gradients = [
                "from-blue-500 via-purple-500 to-pink-500",
                "from-green-500 via-teal-500 to-cyan-500",
                "from-orange-500 via-red-500 to-pink-500",
                "from-indigo-500 via-purple-500 to-fuchsia-500",
                "from-emerald-500 via-green-500 to-teal-500",
                "from-amber-500 via-orange-500 to-red-500",
              ];
              const gradient = gradients[index % gradients.length];
              
              // Auto-convert Google Drive thumbnail URL
              let thumbnailUrl = course.thumbnailUrl;
              if (thumbnailUrl && thumbnailUrl.includes('drive.google.com/file/d/')) {
                const match = thumbnailUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                  thumbnailUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                }
              }

              // Check if course is free
              const isFree = (course as any).isFree === true;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={isFree ? "free-course-wrapper" : ""}
                >
                  {/* BEPUL KURSLAR - maxsus dizayn */}
                  {isFree ? (
                    <div className="relative">
                      {/* Animated Stars */}
                      <div className="free-course-star">⭐</div>
                      <div className="free-course-star">✨</div>
                      <div className="free-course-star">⭐</div>
                      <div className="free-course-star">✨</div>
                      
                      <Card
                        className="hover-elevate transition-all cursor-pointer overflow-hidden h-full border-4 border-amber-400 shadow-lg"
                        data-testid={`card-course-${course.id}`}
                        onClick={() => setLocation(`/checkout/${course.id}`)}
                      >
                        {/* Thumbnail with BEPUL Badge */}
                        <div className="relative h-56 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900 dark:to-yellow-900 flex items-center justify-center border-b overflow-hidden">
                          {/* "Yangi" ribbon */}
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
                          {/* BEPUL Badge - katta va ko'zga tashlanadigan */}
                          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg shadow-xl transform rotate-3">
                            <div className="text-2xl font-black">BEPUL</div>
                            <div className="text-xs text-center">100% Tekin</div>
                          </div>
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && parent.querySelector('.fallback-icon') === null) {
                                  const icon = document.createElement('div');
                                  icon.className = 'fallback-icon flex items-center justify-center w-full h-full';
                                  icon.innerHTML = '<svg class="w-16 h-16 text-amber-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
                                  parent.appendChild(icon);
                                }
                              }}
                            />
                          ) : (
                            <BookOpen className="w-16 h-16 text-amber-600" />
                          )}
                        </div>

                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
                            {course.category && (
                              <Badge variant="secondary" className="shrink-0">
                                {course.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}
                          </p>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description || "Kurs tavsifi yo'q"}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{(course.enrollmentsCount || 0) + ((course as any).customStudentCount || 0)} talaba</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <StarRating 
                                rating={course.averageRating || 0} 
                                size={14} 
                                showValue={true}
                              />
                              <span className="text-xs text-muted-foreground">
                                ({course.totalRatings || 0})
                              </span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3">
                          {/* BEPUL narx ko'rsatish */}
                          <div className="w-full">
                            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border-2 border-green-300 dark:border-green-700">
                              <span className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                BEPUL
                              </span>
                              <span className="text-2xl">🎁</span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCourseForLessons(course);
                              }}
                              variant="outline"
                              className="flex-1"
                              data-testid={`button-view-lessons-${course.id}`}
                            >
                              Darslarni Ko'rish
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer");
                              }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                              data-testid={`button-enroll-${course.id}`}
                            >
                              Bepul Yozilish
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </div>
                  ) : discountPercent > 0 ? (
                    <div className={`p-1 bg-gradient-to-br ${gradient} rounded-lg`}>
                      <Card
                        className="hover-elevate transition-all cursor-pointer border-0 overflow-hidden h-full"
                        data-testid={`card-course-${course.id}`}
                        onClick={() => setLocation(`/checkout/${course.id}`)}
                      >
                        {/* Thumbnail with Sale Badge & New Ribbon */}
                        <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b overflow-hidden">
                          {/* "Yangi" ribbon - chap yuqori burchak */}
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
                          <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-sm font-bold px-3 py-1">
                            -{discountPercent}% CHEGIRMA
                          </Badge>
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                console.error('Course thumbnail failed to load:', course.thumbnailUrl);
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && parent.querySelector('.fallback-icon') === null) {
                                  const icon = document.createElement('div');
                                  icon.className = 'fallback-icon flex items-center justify-center w-full h-full';
                                  icon.innerHTML = '<svg class="w-16 h-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
                                  parent.appendChild(icon);
                                }
                              }}
                            />
                          ) : (
                            <BookOpen className="w-16 h-16 text-muted-foreground" />
                          )}
                        </div>

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
                      {course.category && (
                        <Badge variant="secondary" className="shrink-0">
                          {course.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description || "Kurs tavsifi yo'q"}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{(course.enrollmentsCount || 0) + ((course as any).customStudentCount || 0)} talaba</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StarRating 
                          rating={course.averageRating || 0} 
                          size={14} 
                          showValue={true}
                        />
                        <span className="text-xs text-muted-foreground">
                          ({course.totalRatings || 0})
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-3">
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
                      <div className="w-full">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {formatPrice(displayPrice.toString())}
                          </span>
                          {discountPercent > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              -{discountPercent}%
                            </Badge>
                          )}
                        </div>
                        {discountPercent > 0 && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(basePrice.toString())}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 w-full">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourseForLessons(course);
                        }}
                        variant="outline"
                        className="flex-1"
                        data-testid={`button-view-lessons-${course.id}`}
                      >
                        Darslarni Ko'rish
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer");
                        }}
                        className="flex-1"
                        data-testid={`button-enroll-${course.id}`}
                      >
                        Yozilish
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <Card
                className="hover-elevate transition-all cursor-pointer overflow-hidden h-full"
                data-testid={`card-course-${course.id}`}
                onClick={() => setLocation(`/checkout/${course.id}`)}
              >
                {/* Thumbnail with New Ribbon only */}
                <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b overflow-hidden">
                  {/* "Yangi" ribbon - chap yuqori burchak */}
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
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Course thumbnail failed to load:', course.thumbnailUrl);
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && parent.querySelector('.fallback-icon') === null) {
                          const icon = document.createElement('div');
                          icon.className = 'fallback-icon flex items-center justify-center w-full h-full';
                          icon.innerHTML = '<svg class="w-16 h-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <BookOpen className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
                    {course.category && (
                      <Badge variant="secondary" className="shrink-0">
                        {course.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}
                  </p>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description || "Kurs tavsifi yo'q"}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{(course.enrollmentsCount || 0) + ((course as any).customStudentCount || 0)} talaba</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarRating 
                        rating={course.averageRating || 0} 
                        size={14} 
                        showValue={true}
                      />
                      <span className="text-xs text-muted-foreground">
                        ({course.totalRatings || 0})
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
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
                    <div className="w-full">
                      <span className="text-2xl font-bold">
                        {formatPrice(displayPrice.toString())}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 w-full">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseForLessons(course);
                      }}
                      variant="outline"
                      className="flex-1"
                      data-testid={`button-view-lessons-${course.id}`}
                    >
                      Darslarni Ko'rish
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer");
                      }}
                      className="flex-1"
                      data-testid={`button-enroll-${course.id}`}
                    >
                      Yozilish
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Kurslar topilmadi</h3>
            <p className="text-muted-foreground">
              Qidiruv parametrlarini o'zgartiring yoki filterlarni tozalang
            </p>
          </div>
        )}
      </div>

      {/* Testimonials Section */}
      {testimonials && testimonials.length > 0 && (
        <div className="bg-muted/30 border-y">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Talabalarimiz Fikrlari</h2>
              <p className="text-muted-foreground">
                Minglab talabalar bizga ishonishdi va karyeralarini qurishdi
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((testimonial) => (
                <Card key={testimonial.id} data-testid={`card-testimonial-${testimonial.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {testimonial.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold">{testimonial.studentName}</h4>
                        {testimonial.studentRole && (
                          <p className="text-sm text-muted-foreground">{testimonial.studentRole}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certificates Carousel */}
      {getSetting("certificate_urls") && getSetting("certificate_urls").trim() && (() => {
        // Auto-convert Google Drive URLs to direct image format
        const convertGoogleDriveUrl = (url: string): string => {
          const trimmedUrl = url.trim();
          
          // Check if it's a Google Drive URL
          if (trimmedUrl.includes('drive.google.com/file/d/')) {
            // Extract FILE_ID from: https://drive.google.com/file/d/FILE_ID/view...
            const match = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              return `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
          }
          
          // Return original URL if not Google Drive or already converted
          return trimmedUrl;
        };
        
        const certificateList = getSetting("certificate_urls")
          .split('\n')
          .filter(url => url.trim())
          .map(convertGoogleDriveUrl);
        
        // Simple CSS-based auto-scroll - no measurement needed
        return (
          <div className="w-full overflow-hidden py-16 bg-muted/30 border-y">
            <div className="text-center mb-12 px-4">
              <h2 className="text-3xl font-bold mb-2">Litsenziya va Guvohnomalar</h2>
              <p className="text-muted-foreground">
                Bizning professional sertifikatlarimiz
              </p>
            </div>
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-6 animate-certificate-scroll pl-4"
                style={{
                  width: 'max-content',
                }}
              >
                {/* Triple the content for smooth infinite loop */}
                {certificateList.concat(certificateList, certificateList).map((url, index) => {
                  // Keep original URL - Dropbox URLs work fine with dl=1
                  const imageUrl = url.trim();
                  
                  return (
                    <div
                      key={index}
                      className="flex-shrink-0 w-64 h-80 rounded-lg overflow-hidden border bg-white shadow-lg cursor-pointer hover:scale-105 transition-transform group relative"
                      data-testid={`certificate-${index % certificateList.length}`}
                      onClick={() => setSelectedCertificate({ url: imageUrl, index: index % certificateList.length })}
                    >
                      <img
                        src={imageUrl}
                        alt={`Sertifikat ${(index % certificateList.length) + 1}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Certificate image failed to load:', imageUrl);
                          e.currentTarget.src = "https://via.placeholder.com/256x320/3B82F6/FFFFFF?text=Sertifikat+" + ((index % certificateList.length) + 1);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* About Us Section */}
      {getSetting("about_us") && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Biz Haqimizda</h2>
            <p className="text-lg text-muted-foreground whitespace-pre-line">
              {getSetting("about_us")}
            </p>
          </div>
        </div>
      )}

      {/* Contact Section */}
      {(getSetting("contact_email") || getSetting("contact_phone") || getSetting("contact_address") || getSetting("contact_telegram")) && (
        <div className="bg-muted/30 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Bog'lanish</h2>
              <p className="text-muted-foreground">
                Savollaringiz bormi? Biz bilan bog'laning!
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {getSetting("contact_email") && (
                <Card className="text-center hover-elevate">
                  <CardContent className="pt-6">
                    <a 
                      href={`mailto:${getSetting("contact_email")}`}
                      className="block"
                      data-testid="link-contact-email"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">Email</h3>
                      <p className="text-sm text-muted-foreground break-all">
                        {getSetting("contact_email")}
                      </p>
                    </a>
                  </CardContent>
                </Card>
              )}
              {getSetting("contact_phone") && (
                <Card className="text-center hover-elevate">
                  <CardContent className="pt-6">
                    <a 
                      href={`tel:${getSetting("contact_phone").replace(/\s/g, '')}`}
                      className="block"
                      data-testid="link-contact-phone"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">Telefon</h3>
                      <p className="text-sm text-muted-foreground">
                        {getSetting("contact_phone")}
                      </p>
                    </a>
                  </CardContent>
                </Card>
              )}
              {getSetting("contact_telegram") && (
                <Card className="text-center hover-elevate">
                  <CardContent className="pt-6">
                    <a 
                      href={getSetting("contact_telegram")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      data-testid="link-contact-telegram"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Send className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2 flex items-center justify-center gap-1">
                        Telegram
                        <ExternalLink className="w-3 h-3" />
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Guruhga qo'shiling
                      </p>
                    </a>
                  </CardContent>
                </Card>
              )}
              {getSetting("contact_address") && (
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Manzil</h3>
                    <p className="text-sm text-muted-foreground">
                      {getSetting("contact_address")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      <Dialog open={selectedCertificate !== null} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Sertifikat #{selectedCertificate ? selectedCertificate.index + 1 : ''}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedCertificate && (
              <div className="relative">
                <img
                  src={selectedCertificate.url}
                  alt={`Sertifikat ${selectedCertificate.index + 1}`}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    console.error('Certificate image failed to load in modal:', selectedCertificate.url);
                    e.currentTarget.src = "https://via.placeholder.com/800x1000/3B82F6/FFFFFF?text=Sertifikat+" + (selectedCertificate.index + 1);
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Demo Video Player Modal */}
      <Dialog 
        open={selectedDemoLesson !== null} 
        onOpenChange={() => setSelectedDemoLesson(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedDemoLesson?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDemoLesson?.videoUrl && (
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                {(() => {
                  const videoContent = selectedDemoLesson.videoUrl.trim();
                  
                  // Check if it's an iframe embed code
                  if (videoContent.startsWith('<iframe') || videoContent.startsWith('<embed')) {
                    return (
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: videoContent }}
                        data-testid="demo-video-player"
                      />
                    );
                  }
                  
                  // Parse YouTube URLs
                  if (videoContent.includes('youtube.com') || videoContent.includes('youtu.be')) {
                    let videoId = '';
                    
                    if (videoContent.includes('youtube.com/watch?v=')) {
                      videoId = videoContent.split('watch?v=')[1]?.split('&')[0];
                    } else if (videoContent.includes('youtube.com/embed/')) {
                      videoId = videoContent.split('embed/')[1]?.split('?')[0];
                    } else if (videoContent.includes('youtu.be/')) {
                      videoId = videoContent.split('youtu.be/')[1]?.split('?')[0];
                    }
                    
                    if (videoId) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          data-testid="demo-video-player"
                        />
                      );
                    }
                  }
                  
                  // Check for Kinescope, Vimeo and other video platforms
                  if (videoContent.includes('kinescope.io') || 
                      videoContent.includes('vimeo.com') ||
                      videoContent.includes('player.vimeo.com') ||
                      videoContent.includes('dailymotion.com') ||
                      videoContent.includes('wistia.com')) {
                    return (
                      <iframe
                        src={videoContent}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        data-testid="demo-video-player"
                      />
                    );
                  }
                  
                  // Try to treat as direct video URL or iframe src
                  if (videoContent.startsWith('http://') || videoContent.startsWith('https://')) {
                    return (
                      <iframe
                        src={videoContent}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        data-testid="demo-video-player"
                      />
                    );
                  }
                  
                  // Default: show as link
                  return (
                    <div className="text-white p-8 text-center flex flex-col items-center justify-center h-full">
                      <p className="mb-4">Video formatini aniqlab bo'lmadi</p>
                      <a 
                        href={videoContent} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Video havolasini ochish
                      </a>
                    </div>
                  );
                })()}
              </div>
            )}
            {selectedDemoLesson?.duration && (
              <p className="text-sm text-muted-foreground">
                Davomiyligi: {selectedDemoLesson.duration} daqiqa
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Lessons Modal */}
      <Dialog 
        open={selectedCourseForLessons !== null} 
        onOpenChange={() => setSelectedCourseForLessons(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedCourseForLessons?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {courseLessons && courseLessons.length > 0 ? (
              <div className="space-y-2">
                {courseLessons.map((lesson, index) => {
                  const canViewDemo = lesson.isDemo && lesson.videoUrl && lesson.videoUrl.trim() !== '';
                  
                  return <Card 
                    key={lesson.id}
                    className={`
                      ${canViewDemo 
                        ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800 hover-elevate cursor-pointer" 
                        : "opacity-75"}
                      transition-all duration-200
                    `}
                    onClick={() => {
                      // SECURITY: Only allow demo lessons with valid video URLs
                      if (canViewDemo) {
                        setSelectedDemoLesson(lesson);
                      }
                    }}
                    data-testid={`card-lesson-${lesson.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`
                          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1
                          ${lesson.isDemo 
                            ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/50" 
                            : "bg-muted"}
                        `}>
                          {lesson.isDemo ? (
                            <Play className="w-5 h-5 fill-white" />
                          ) : (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`font-semibold ${lesson.isDemo ? 'text-orange-900 dark:text-orange-100' : ''}`}>
                              {lesson.title}
                            </h4>
                            {lesson.isDemo ? (
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-sm">
                                Bepul Demo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Premium
                              </Badge>
                            )}
                          </div>
                          {lesson.description && (
                            <p className={`text-sm mb-2 ${lesson.isDemo ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}>
                              {lesson.description}
                            </p>
                          )}
                          {lesson.duration && (
                            <p className={`text-sm flex items-center gap-1 ${lesson.isDemo ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                              <Clock className="w-4 h-4" />
                              {lesson.duration} daqiqa
                            </p>
                          )}
                          {canViewDemo && (
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              Bosib ko'ring
                            </p>
                          )}
                          {!lesson.isDemo && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Bu darsni ko'rish uchun kursga yoziling
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Hali darslar qo'shilmagan</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Zamonaviy Ta'lim loyihasi. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
