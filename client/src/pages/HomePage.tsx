import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, BookOpen, Users, Award, Star, Mail, Phone, MapPin, Send, ExternalLink, X, ZoomIn, Play, Lock, Clock, GraduationCap, TrendingUp, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, PenTool, Headphones, Mic, BookText, Languages, FileText, Download, ChevronDown, Youtube, List, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  PenTool,
  Headphones,
  Mic,
  BookText,
  Languages,
  GraduationCap,
  Play,
  Star,
  Award,
  Users,
  Clock,
};

const getIconComponent = (iconName: string | null | undefined) => {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  return Icon ? <Icon className="w-4 h-4" /> : null;
};
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
import { ModernHeader } from "@/components/ModernHeader";
import { ModernFooter } from "@/components/ModernFooter";
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
  pdfUrl?: string;
  isDemo: boolean;
  duration?: number;
  order: number;
  moduleId?: string | null;
};

type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedCertificate, setSelectedCertificate] = useState<{ url: string; index: number } | null>(null);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<PublicCourse | null>(null);
  const [selectedDemoLesson, setSelectedDemoLesson] = useState<Lesson | null>(null);
  const [demoCourseId, setDemoCourseId] = useState<string | null>(null);
  const [showDemoLessonsList, setShowDemoLessonsList] = useState(false);
  const [promoVideoCourse, setPromoVideoCourse] = useState<PublicCourse | null>(null);

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedLevel) params.append("levelId", selectedLevel);
    
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

  // Fetch site settings
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
  });

  // Fetch testimonials
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  // Fetch language levels for filtering
  const { data: languageLevels } = useQuery<any[]>({
    queryKey: ["/api/language-levels"],
  });

  // Fetch lessons for selected course
  const { data: courseLessons, isLoading: isCourseLessonsLoading } = useQuery<Lesson[]>({
    queryKey: selectedCourseForLessons 
      ? [`/api/courses/${selectedCourseForLessons.id}/lessons/public`]
      : [],
    enabled: !!selectedCourseForLessons,
  });

  // Fetch modules for selected course
  const { data: courseModules } = useQuery<CourseModule[]>({
    queryKey: selectedCourseForLessons 
      ? [`/api/courses/${selectedCourseForLessons.id}/modules/public`]
      : [],
    enabled: !!selectedCourseForLessons,
  });

  const { data: demoCourseLessons } = useQuery<Lesson[]>({
    queryKey: demoCourseId ? [`/api/courses/${demoCourseId}/lessons/public`] : [],
    enabled: !!demoCourseId,
  });

  const demoOnlyLessons = useMemo(() => {
    if (!demoCourseLessons) return [];
    return demoCourseLessons.filter(l => l.isDemo).sort((a, b) => a.order - b.order);
  }, [demoCourseLessons]);

  const currentDemoIndex = useMemo(() => {
    if (!selectedDemoLesson || !demoOnlyLessons.length) return -1;
    return demoOnlyLessons.findIndex(l => l.id === selectedDemoLesson.id);
  }, [selectedDemoLesson, demoOnlyLessons]);

  const demoCourseContext = useMemo(() => {
    if (!demoCourseId || !courses) return null;
    return courses.find(c => c.id === demoCourseId) || null;
  }, [demoCourseId, courses]);

  const openDemoLesson = (lesson: Lesson, courseId: string) => {
    setSelectedDemoLesson(lesson);
    setDemoCourseId(courseId);
    setShowDemoLessonsList(false);
  };

  const goToPrevDemo = () => {
    if (currentDemoIndex > 0) {
      setSelectedDemoLesson(demoOnlyLessons[currentDemoIndex - 1]);
    }
  };

  const goToNextDemo = () => {
    if (currentDemoIndex < demoOnlyLessons.length - 1) {
      setSelectedDemoLesson(demoOnlyLessons[currentDemoIndex + 1]);
    }
  };

  const closeDemoPlayer = () => {
    setSelectedDemoLesson(null);
    setDemoCourseId(null);
    setShowDemoLessonsList(false);
  };

  // Module gradient colors palette - same as LearningPage
  const moduleColors = [
    { bg: "from-blue-500/15 to-indigo-500/15 dark:from-blue-500/25 dark:to-indigo-500/25", border: "border-blue-500/40 dark:border-blue-400/50", ring: "ring-blue-500", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500 dark:bg-blue-600" },
    { bg: "from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/25 dark:to-teal-500/25", border: "border-emerald-500/40 dark:border-emerald-400/50", ring: "ring-emerald-500", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500 dark:bg-emerald-600" },
    { bg: "from-purple-500/15 to-pink-500/15 dark:from-purple-500/25 dark:to-pink-500/25", border: "border-purple-500/40 dark:border-purple-400/50", ring: "ring-purple-500", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500 dark:bg-purple-600" },
    { bg: "from-orange-500/15 to-amber-500/15 dark:from-orange-500/25 dark:to-amber-500/25", border: "border-orange-500/40 dark:border-orange-400/50", ring: "ring-orange-500", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500 dark:bg-orange-600" },
    { bg: "from-rose-500/15 to-red-500/15 dark:from-rose-500/25 dark:to-red-500/25", border: "border-rose-500/40 dark:border-rose-400/50", ring: "ring-rose-500", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500 dark:bg-rose-600" },
    { bg: "from-cyan-500/15 to-sky-500/15 dark:from-cyan-500/25 dark:to-sky-500/25", border: "border-cyan-500/40 dark:border-cyan-400/50", ring: "ring-cyan-500", text: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500 dark:bg-cyan-600" },
  ];

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Modern Header */}
      <ModernHeader />

      <main className="flex-1">
      {/* Hero Section */}
      <motion.div 
        className="relative gradient-hero-enhanced border-b overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ duration: 0.6 }}
      >
        {/* Animated floating orbs */}
        <div className="floating-orb w-[500px] h-[500px] bg-blue-500/30 dark:bg-blue-400/20 top-[-200px] left-[-100px]" style={{ animationDelay: '0s' }} />
        <div className="floating-orb w-[400px] h-[400px] bg-purple-500/25 dark:bg-purple-400/15 top-[50%] right-[-150px]" style={{ animationDelay: '-5s' }} />
        <div className="floating-orb w-[300px] h-[300px] bg-pink-500/20 dark:bg-pink-400/10 bottom-[-100px] left-[30%]" style={{ animationDelay: '-10s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center space-y-6">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold" 
              data-testid="text-hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
             Zamonaviy-EDU
              <br />
              <span className="text-primary">Zamonaviy Ta'lim loyihasi</span>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Kurs qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                data-testid="button-explore"
              >
                Kurslarni Ko'rish
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Courses Grid */}
      <div id="courses-section" className="relative overflow-x-clip">
        {/* Enhanced background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
        
        {/* Subtle floating accent shapes */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Modern Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4" data-testid="badge-courses-label">
              <BookOpen className="w-4 h-4" />
              <span>Bizning Kurslar</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-courses-header">Mavjud Kurslar</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O'zingizga mos kursni tanlang va bugun bilim olishni boshlang
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-sm px-4 py-1" data-testid="badge-course-count">
                {courses?.length || 0} ta kurs
              </Badge>
              {(selectedCategory || selectedLevel || priceRange) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedLevel("");
                    setPriceRange("");
                  }}
                  className="gap-1 text-muted-foreground"
                  data-testid="button-clear-all-filters"
                >
                  <X className="w-3 h-3" />
                  Tozalash
                </Button>
              )}
            </div>
          </motion.div>

          {/* Modern Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-10"
          >
            <Card className="border-0 shadow-xl bg-gradient-to-r from-background via-muted/30 to-background backdrop-blur-sm overflow-hidden">
              <div className="p-6 space-y-6">
                {/* CEFR Levels - Modern Chips */}
                {languageLevels && languageLevels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <GraduationCap className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Til Darajasi (CEFR)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={!selectedLevel ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedLevel("")}
                        className={!selectedLevel ? "shadow-md" : ""}
                        data-testid="filter-level-all"
                      >
                        Barchasi
                      </Button>
                      {languageLevels.map((level) => (
                        <Button
                          key={level.id}
                          variant={selectedLevel === level.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedLevel(selectedLevel === level.id ? "" : level.id)}
                          className={selectedLevel === level.id ? "shadow-md" : ""}
                          aria-pressed={selectedLevel === level.id}
                          data-testid={`filter-level-${level.id}`}
                        >
                          <span className="font-bold mr-1">{level.code}</span>
                          {level.name && <span className="text-muted-foreground">{level.name}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category and Price - Modern Selects */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2">
                    <Filter className="w-4 h-4 text-primary" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent border-0 text-sm font-medium focus:outline-none cursor-pointer"
                      data-testid="select-category"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <select
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="bg-transparent border-0 text-sm font-medium focus:outline-none cursor-pointer"
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
              </div>
            </Card>
          </motion.div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="aspect-[3/4] bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="h-5 bg-muted rounded-lg w-4/5 animate-pulse" />
                      <div className="h-4 bg-muted rounded-lg w-2/3 animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                      <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-7 w-24 bg-muted rounded-lg animate-pulse" />
                      <div className="h-9 w-28 bg-primary/20 rounded-lg animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
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
              
              // Auto-convert Google Drive thumbnail URL (supports multiple formats)
              let thumbnailUrl = course.thumbnailUrl;
              if (thumbnailUrl && thumbnailUrl.includes('drive.google.com')) {
                let fileId = null;
                
                // Format 1: drive.google.com/file/d/FILE_ID/view
                const fileMatch = thumbnailUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (fileMatch && fileMatch[1]) {
                  fileId = fileMatch[1];
                }
                
                // Format 2: drive.google.com/open?id=FILE_ID
                if (!fileId) {
                  const openMatch = thumbnailUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  if (openMatch && openMatch[1]) {
                    fileId = openMatch[1];
                  }
                }
                
                // Format 3: drive.google.com/uc?id=FILE_ID (already correct format)
                if (!fileId && thumbnailUrl.includes('/uc?')) {
                  const ucMatch = thumbnailUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  if (ucMatch && ucMatch[1]) {
                    fileId = ucMatch[1];
                  }
                }
                
                // Format 4: drive.google.com/thumbnail?id=FILE_ID
                if (!fileId && thumbnailUrl.includes('/thumbnail?')) {
                  const thumbMatch = thumbnailUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  if (thumbMatch && thumbMatch[1]) {
                    fileId = thumbMatch[1];
                  }
                }
                
                if (fileId) {
                  // Use lh3.googleusercontent.com for better image loading
                  thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
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
                      <Card
                        className="modern-card hover-elevate transition-all cursor-pointer rounded-xl h-full border-2 border-amber-400 shadow-lg"
                        data-testid={`card-course-${course.id}`}
                        onClick={() => setLocation(`/checkout/${course.id}`)}
                      >
                        {/* Thumbnail with BEPUL Badge */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 flex items-center justify-center rounded-t-xl overflow-hidden">
                          {/* "Yangi" ribbon */}
                          {isNew && (
                            <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                              <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                                <div className="text-[10px]">
                                  YANGI
                                  {daysAgo === 0 ? "" : ` (${daysAgo}k)`}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* BEPUL Badge - katta va ko'zga tashlanadigan */}
                          <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-xl">
                            <div className="text-sm font-black">BEPUL</div>
                          </div>
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-cover"
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
                              <span>{course.enrollmentsCount} talaba</span>
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
                          {/* Darslarni Ko'rish - katta tugma */}
                          <div className="w-full flex gap-2">
                            <Button
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCourseForLessons(course);
                              }}
                              className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                              data-testid={`button-view-lessons-${course.id}`}
                            >
                              Darslarni Ko'rish
                            </Button>
                                                      </div>
                          {/* Kurs haqida batafsil tugmasi */}
                          {(course as any).promoVideoUrl && (
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromoVideoCourse(course);
                              }}
                              className="w-full h-12 border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold"
                              data-testid={`button-promo-video-${course.id}`}
                            >
                              <Youtube className="w-5 h-5 mr-2" />
                              Kurs haqida batafsil
                            </Button>
                          )}
                          {/* BEPUL narx ko'rsatish */}
                          <div className="w-full">
                            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border-2 border-green-300 dark:border-green-700">
                              <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                BEPUL
                              </span>
                              <span className="text-xl">🎁</span>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                    </div>
                  ) : discountPercent > 0 ? (
                    <div className={`p-[2px] bg-gradient-to-br ${gradient} rounded-xl`}>
                      <Card
                        className="modern-card hover-elevate transition-all cursor-pointer border-0 rounded-xl h-full bg-background"
                        data-testid={`card-course-${course.id}`}
                        onClick={() => setLocation(`/checkout/${course.id}`)}
                      >
                        {/* Thumbnail with Sale Badge & New Ribbon */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-t-xl overflow-hidden">
                          {/* "Yangi" ribbon - chap yuqori burchak */}
                          {isNew && (
                            <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                              <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                                <div className="text-[10px]">
                                  YANGI
                                  {daysAgo === 0 ? "" : ` (${daysAgo}k)`}
                                </div>
                              </div>
                            </div>
                          )}
                          <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-xs font-bold px-2 py-1 shadow-lg">
                            -{discountPercent}%
                          </Badge>
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-cover"
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
                        <span>{course.enrollmentsCount} talaba</span>
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
                    {/* Kurs haqida batafsil tugmasi */}
                    {(course as any).promoVideoUrl && (
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromoVideoCourse(course);
                        }}
                        className="w-full border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold"
                        data-testid={`button-promo-video-${course.id}`}
                      >
                        <Youtube className="w-5 h-5 mr-2" />
                        Kurs haqida batafsil
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <>
                {/* Oddiy karta (chegirmasiz) */}
                <Card
                  className="modern-card hover-elevate transition-all cursor-pointer rounded-xl h-full"
                  data-testid={`card-course-${course.id}`}
                  onClick={() => setLocation(`/checkout/${course.id}`)}
                >
                {/* Thumbnail with New Ribbon only */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-t-xl overflow-hidden">
                  {/* "Yangi" ribbon - chap yuqori burchak */}
                  {isNew && (
                    <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                      <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                        <div className="text-[10px]">
                          YANGI
                          {daysAgo === 0 ? "" : ` (${daysAgo}k)`}
                        </div>
                      </div>
                    </div>
                  )}
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
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
                      <span>{course.enrollmentsCount} talaba</span>
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
                  {/* Kurs haqida batafsil tugmasi */}
                  {(course as any).promoVideoUrl && (
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromoVideoCourse(course);
                      }}
                      className="w-full border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold"
                      data-testid={`button-promo-video-${course.id}`}
                    >
                      <Youtube className="w-5 h-5 mr-2" />
                      Kurs haqida batafsil
                    </Button>
                  )}
                </CardFooter>
              </Card>
              </>
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
      </div>

      {/* Testimonials Section */}
      {testimonials && testimonials.length > 0 && (
        <div className="relative overflow-hidden border-y">
          {/* Enhanced gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-primary/5 pointer-events-none" />
          <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
          
          {/* Decorative elements */}
          <div className="absolute top-10 left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4" data-testid="badge-testimonials-label">
                <Star className="w-4 h-4" />
                <span>Talabalar Fikrlari</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-testimonials-header">Talabalarimiz Nima Deyishadi</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Minglab talabalar bizga ishonishdi va karyeralarini qurishdi
              </p>
            </motion.div>
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
          <div className="w-full overflow-hidden relative border-y">
            {/* Enhanced background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-background to-primary/5 pointer-events-none" />
            <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
            
            <div className="relative py-20">
              <motion.div 
                className="text-center mb-12 px-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4" data-testid="badge-certificates-label">
                  <Award className="w-4 h-4" />
                  <span>Sertifikatlar</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-certificates-header">Litsenziya va Guvohnomalar</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Bizning professional sertifikatlarimiz va litsenziyalarimiz
                </p>
              </motion.div>
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
          </div>
        );
      })()}

      {/* About Us Section */}
      {getSetting("about_us") && (
        <div className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4" data-testid="badge-about-label">
                <Users className="w-4 h-4" />
                <span>Biz Haqimizda</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" data-testid="text-about-header">Zamonaviy-EDU</h2>
              <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
                {getSetting("about_us")}
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* Contact Section */}
      {(getSetting("contact_email") || getSetting("contact_phone") || getSetting("contact_address") || getSetting("contact_telegram")) && (
        <div className="relative overflow-hidden border-t">
          {/* Enhanced gradient background */}
          <div className="absolute inset-0 bg-gradient-to-tl from-primary/5 via-background to-accent/5 pointer-events-none" />
          <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
          
          {/* Decorative orbs */}
          <div className="absolute bottom-0 left-[20%] w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-[20%] w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4" data-testid="badge-contact-label">
                <Mail className="w-4 h-4" />
                <span>Aloqa</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-contact-header">Biz bilan Bog'laning</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Savollaringiz bormi? Biz sizga yordam berishga tayyormiz!
              </p>
            </motion.div>
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

      {/* Demo Video Player Modal - Mobile Optimized */}
      <Dialog 
        open={selectedDemoLesson !== null} 
        onOpenChange={() => closeDemoPlayer()}
      >
        <DialogContent className="w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 sm:p-6 gap-0 border-0 sm:border rounded-none sm:rounded-lg">
          {/* Mobile-friendly header with back button */}
          <div className="flex items-center gap-3 p-4 sm:p-0 sm:pb-4 bg-background sticky top-0 z-10 border-b sm:border-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => closeDemoPlayer()}
              className="shrink-0"
              data-testid="button-back-from-video"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <DialogHeader className="flex-1 space-y-0 min-w-0">
              <DialogTitle className="text-base sm:text-lg line-clamp-1">{selectedDemoLesson?.title}</DialogTitle>
              {demoCourseContext && (
                <p className="text-xs text-muted-foreground line-clamp-1">{demoCourseContext.title}</p>
              )}
            </DialogHeader>
            {demoOnlyLessons.length > 1 && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {currentDemoIndex + 1}/{demoOnlyLessons.length}
              </Badge>
            )}
          </div>
          <div className="flex-1 flex flex-col sm:space-y-4 overflow-y-auto">
            {selectedDemoLesson?.videoUrl && (
              <div className="w-full flex-shrink-0 aspect-video bg-black sm:rounded-lg overflow-hidden">
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
                  
                  // Check for Google Drive URLs
                  if (videoContent.includes('drive.google.com')) {
                    let fileId = '';
                    
                    if (videoContent.includes('/file/d/')) {
                      fileId = videoContent.split('/file/d/')[1]?.split('/')[0];
                    } else if (videoContent.includes('id=')) {
                      const idMatch = videoContent.match(/id=([a-zA-Z0-9_-]+)/);
                      fileId = idMatch ? idMatch[1] : '';
                    } else if (videoContent.includes('/d/')) {
                      fileId = videoContent.split('/d/')[1]?.split('/')[0];
                    }
                    
                    if (fileId) {
                      const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                      return (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media; fullscreen"
                          allowFullScreen
                          loading="lazy"
                          data-testid="demo-video-player-gdrive"
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
              <p className="text-sm text-muted-foreground p-4 sm:p-0">
                Davomiyligi: {selectedDemoLesson.duration} daqiqa
              </p>
            )}
            
            {/* PDF Resources for demo lesson */}
            {selectedDemoLesson?.pdfUrl && (
              <div className="p-4 sm:p-0 border-t sm:border-t-0">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">PDF Manba</p>
                    <p className="text-xs text-muted-foreground truncate">Darsga oid qo'shimcha material</p>
                  </div>
                  <a
                    href={selectedDemoLesson.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    data-testid="link-demo-pdf-download"
                  >
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Yuklab olish</span>
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {demoCourseContext && (
              <div className="p-4 sm:p-0 border-t sm:border-t-0">
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">To'liq kursga yoziling</p>
                    <Button size="sm" onClick={() => setLocation(`/auth`)} data-testid="button-enroll-from-demo">
                      Yozilish
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {demoOnlyLessons.length > 1 && (
              <div className="p-4 sm:p-0 border-t sm:border-t-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevDemo}
                    disabled={currentDemoIndex <= 0}
                    className="flex-1 gap-1"
                    data-testid="button-prev-demo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDemoLessonsList(!showDemoLessonsList)}
                    data-testid="button-demo-lessons-list"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToNextDemo}
                    disabled={currentDemoIndex >= demoOnlyLessons.length - 1}
                    className="flex-1 gap-1"
                    data-testid="button-next-demo"
                  >
                    Keyingi
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {showDemoLessonsList && (
                  <div className="mt-3 space-y-1.5">
                    {demoOnlyLessons.map((lesson, idx) => (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          lesson.id === selectedDemoLesson?.id
                            ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700"
                            : "hover-elevate"
                        }`}
                        onClick={() => {
                          setSelectedDemoLesson(lesson);
                          setShowDemoLessonsList(false);
                        }}
                        data-testid={`demo-list-item-${lesson.id}`}
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                          lesson.id === selectedDemoLesson?.id
                            ? "bg-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-sm truncate ${
                          lesson.id === selectedDemoLesson?.id ? "font-semibold" : ""
                        }`}>{lesson.title}</span>
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{lesson.duration} daq</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Lessons Modal - Mobile Optimized */}
      <Dialog 
        open={selectedCourseForLessons !== null} 
        onOpenChange={() => setSelectedCourseForLessons(null)}
      >
        <DialogContent className="w-full max-w-3xl h-[100dvh] sm:h-[85vh] p-0 sm:p-6 gap-0 border-0 sm:border rounded-none sm:rounded-lg flex flex-col">
          {/* Mobile-friendly header with back button */}
          <div className="flex items-center gap-3 p-4 sm:p-0 sm:pb-4 bg-background sticky top-0 z-10 border-b sm:border-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCourseForLessons(null)}
              className="shrink-0"
              data-testid="button-back-from-lessons"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <DialogHeader className="flex-1 space-y-0">
              <DialogTitle className="text-base sm:text-lg line-clamp-1">{selectedCourseForLessons?.title}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-0">
            {isCourseLessonsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : courseLessons && courseLessons.length > 0 ? (
              <div className="space-y-4">
                {/* Render lessons grouped by modules if modules exist */}
                {courseModules && courseModules.length > 0 && (() => {
                  const sortedModules = [...courseModules].sort((a, b) => a.order - b.order);
                  const moduleLessons = courseLessons.filter(l => l.moduleId);
                  const standaloneLessons = courseLessons.filter(l => !l.moduleId);
                  
                  return (
                    <>
                      {sortedModules.map((module, moduleIndex) => {
                        const lessonsInModule = moduleLessons
                          .filter(l => l.moduleId === module.id)
                          .sort((a, b) => a.order - b.order);
                        
                        if (lessonsInModule.length === 0) return null;
                        
                        const colors = moduleColors[moduleIndex % moduleColors.length];
                        const demoCount = lessonsInModule.filter(l => l.isDemo).length;
                        
                        return (
                          <div key={module.id} className="mb-4" data-testid={`public-module-${module.id}`}>
                            {/* Module Header with gradient effect */}
                            <div 
                              className={`relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-r ${colors.bg} backdrop-blur-sm mb-2`}
                            >
                              <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                              <div className="relative p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${colors.badge} flex items-center justify-center shadow-lg`}>
                                    <span className="text-white font-bold">{moduleIndex + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                                        MODUL {moduleIndex + 1}
                                      </span>
                                      {demoCount > 0 && (
                                        <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-4">
                                          {demoCount} demo
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="font-semibold text-sm sm:text-base truncate">{module.title}</h3>
                                    <p className="text-xs text-muted-foreground">{lessonsInModule.length} ta dars</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Lessons in module */}
                            <div className="space-y-2 pl-4">
                              {lessonsInModule.map((lesson, lessonIndex) => {
                                const canViewDemo = lesson.isDemo && lesson.videoUrl && lesson.videoUrl.trim() !== '';
                                return (
                                  <div
                                    key={lesson.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                                      canViewDemo 
                                        ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 hover-elevate cursor-pointer" 
                                        : "bg-muted/30 opacity-75"
                                    }`}
                                    onClick={() => canViewDemo && selectedCourseForLessons && openDemoLesson(lesson, selectedCourseForLessons.id)}
                                    data-testid={`public-lesson-${lesson.id}`}
                                  >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                      lesson.isDemo 
                                        ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md" 
                                        : "bg-muted"
                                    }`}>
                                      {lesson.isDemo ? (
                                        <Play className="w-4 h-4 fill-white" />
                                      ) : (
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-medium text-sm truncate ${lesson.isDemo ? 'text-orange-900 dark:text-orange-100' : ''}`}>
                                        {lesson.title}
                                      </h4>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {lesson.duration && <span>{lesson.duration} daqiqa</span>}
                                        {lesson.pdfUrl && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>}
                                      </div>
                                    </div>
                                    {lesson.isDemo ? (
                                      <Badge className="bg-orange-500 text-white text-xs">Demo</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">Premium</Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Standalone lessons without modules */}
                      {standaloneLessons.length > 0 && (
                        <div className="space-y-2">
                          {standaloneLessons.map((lesson) => {
                            const canViewDemo = lesson.isDemo && lesson.videoUrl && lesson.videoUrl.trim() !== '';
                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                                  canViewDemo 
                                    ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 hover-elevate cursor-pointer" 
                                    : "bg-muted/30 opacity-75"
                                }`}
                                onClick={() => canViewDemo && selectedCourseForLessons && openDemoLesson(lesson, selectedCourseForLessons.id)}
                                data-testid={`public-lesson-${lesson.id}`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                  lesson.isDemo 
                                    ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md" 
                                    : "bg-muted"
                                }`}>
                                  {lesson.isDemo ? (
                                    <Play className="w-4 h-4 fill-white" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium text-sm truncate ${lesson.isDemo ? 'text-orange-900 dark:text-orange-100' : ''}`}>
                                    {lesson.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {lesson.duration && <span>{lesson.duration} daqiqa</span>}
                                    {lesson.pdfUrl && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>}
                                  </div>
                                </div>
                                {lesson.isDemo ? (
                                  <Badge className="bg-orange-500 text-white text-xs">Demo</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Premium</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {/* Fallback: render all lessons without module grouping if no modules */}
                {(!courseModules || courseModules.length === 0) && courseLessons.map((lesson) => {
                  const canViewDemo = lesson.isDemo && lesson.videoUrl && lesson.videoUrl.trim() !== '';
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                        canViewDemo 
                          ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 hover-elevate cursor-pointer" 
                          : "bg-muted/30 opacity-75"
                      }`}
                      onClick={() => canViewDemo && selectedCourseForLessons && openDemoLesson(lesson, selectedCourseForLessons.id)}
                      data-testid={`public-lesson-${lesson.id}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        lesson.isDemo 
                          ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md" 
                          : "bg-muted"
                      }`}>
                        {lesson.isDemo ? (
                          <Play className="w-4 h-4 fill-white" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm truncate ${lesson.isDemo ? 'text-orange-900 dark:text-orange-100' : ''}`}>
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lesson.duration && <span>{lesson.duration} daqiqa</span>}
                          {lesson.pdfUrl && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>}
                        </div>
                      </div>
                      {lesson.isDemo ? (
                        <Badge className="bg-orange-500 text-white text-xs">Demo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Premium</Badge>
                      )}
                    </div>
                  );
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

      {/* Promo Video Popup */}
      <Dialog 
        open={promoVideoCourse !== null} 
        onOpenChange={() => setPromoVideoCourse(null)}
      >
        <DialogContent className="w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 border-0 sm:border rounded-none sm:rounded-lg flex flex-col">
          {/* Mobile-friendly header with back button */}
          <div className="flex items-center gap-3 p-4 bg-background border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPromoVideoCourse(null)}
              className="shrink-0"
              data-testid="button-close-promo-video"
            >
              <X className="w-5 h-5" />
            </Button>
            <DialogHeader className="flex-1 space-y-0">
              <DialogTitle className="text-base sm:text-lg line-clamp-1 flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                {promoVideoCourse?.title} - Kurs Haqida
              </DialogTitle>
            </DialogHeader>
          </div>
          {/* Video Container */}
          <div className="flex-1 overflow-hidden bg-black">
            {promoVideoCourse && (promoVideoCourse as any).promoVideoUrl && (() => {
              const url = (promoVideoCourse as any).promoVideoUrl;
              // Extract YouTube video ID
              let videoId = '';
              try {
                if (url.includes('youtube.com/watch')) {
                  const urlObj = new URL(url);
                  videoId = urlObj.searchParams.get('v') || '';
                } else if (url.includes('youtu.be/')) {
                  videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
                } else if (url.includes('youtube.com/embed/')) {
                  videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
                }
              } catch (e) {
                console.error('Invalid YouTube URL', e);
              }
              
              if (videoId) {
                return (
                  <div className="relative w-full h-0 pb-[56.25%]">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                      title={`${promoVideoCourse?.title} - Kurs Haqida Video`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              
              return (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p>Video yuklab bo'lmadi</p>
                </div>
              );
            })()}
          </div>
          {/* Course Info Footer */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{promoVideoCourse?.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {promoVideoCourse?.description}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPromoVideoCourse(null);
                    if (promoVideoCourse) {
                      setSelectedCourseForLessons(promoVideoCourse);
                    }
                  }}
                  data-testid="button-view-lessons-from-promo"
                >
                  Darslarni Ko'rish
                </Button>
                <Button
                  onClick={() => {
                    window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer");
                  }}
                  data-testid="button-enroll-from-promo"
                >
                  Yozilish
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </main>

      {/* Modern Footer */}
      <ModernFooter />
    </div>
  );
}
