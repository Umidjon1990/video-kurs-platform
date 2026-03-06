import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, BookOpen, Users, Award, Star, Mail, Phone, MapPin, Send, ExternalLink, X, ZoomIn, Play, Lock, Clock, GraduationCap, TrendingUp, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, PenTool, Headphones, Mic, BookText, Languages, FileText, Download, ChevronDown, Youtube, List, Info, ArrowRight, Sparkles, Code2, Megaphone, LayoutGrid, type LucideIcon } from "lucide-react";

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
  const [location, setLocation] = useLocation();
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
  const [detailCourse, setDetailCourse] = useState<PublicCourse | null>(null);

  // Icon animation via data-anim attribute on button — CSS selects .ic span inside
  // Auto-scroll to courses section when navigating to /explore
  useEffect(() => {
    if (location === '/explore') {
      const timeout = setTimeout(() => {
        document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [location]);

  // Handle sessionStorage scroll targets (from header nav on other pages)
  useEffect(() => {
    const scrollTarget = sessionStorage.getItem('scrollTo');
    if (scrollTarget) {
      sessionStorage.removeItem('scrollTo');
      const timeout = setTimeout(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, []);

  // This approach survives React re-renders because we write to the actual DOM node
  const doAnim = (btn: HTMLButtonElement, type: 'spin' | 'shoot' | 'pop', ms: number) => {
    btn.dataset.anim = type;
    setTimeout(() => { delete btn.dataset.anim; }, ms);
  };

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
    { value: "", label: "Barchasi", icon: LayoutGrid, from: "#64748b", to: "#475569", shadow: "rgba(100,116,139,0.5)", shadowColor: "#334155" },
    { value: "IT", label: "Dasturlash", icon: Code2, from: "#3b82f6", to: "#1d4ed8", shadow: "rgba(59,130,246,0.5)", shadowColor: "#1e3a8a" },
    { value: "Design", label: "Dizayn", icon: PenTool, from: "#8b5cf6", to: "#6d28d9", shadow: "rgba(139,92,246,0.5)", shadowColor: "#4c1d95" },
    { value: "Business", label: "Biznes", icon: TrendingUp, from: "#10b981", to: "#059669", shadow: "rgba(16,185,129,0.5)", shadowColor: "#064e3b" },
    { value: "Til", label: "Tillar", icon: Languages, from: "#06b6d4", to: "#0891b2", shadow: "rgba(6,182,212,0.5)", shadowColor: "#164e63" },
    { value: "Marketing", label: "Marketing", icon: Megaphone, from: "#f97316", to: "#ea580c", shadow: "rgba(249,115,22,0.5)", shadowColor: "#7c2d12" },
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
      {/* ============ HYPER-WOW HERO ============ */}
      <section
        className="relative flex flex-col overflow-hidden"
        style={{
          minHeight: '100svh',
          background: 'linear-gradient(135deg, #0a0520 0%, #0d1440 40%, #0a1628 70%, #0d0a30 100%)',
        }}
      >
        {/* Aurora blobs */}
        <div className="wow-blob wow-blob-1" />
        <div className="wow-blob wow-blob-2" />
        <div className="wow-blob wow-blob-3" />
        <div className="wow-blob wow-blob-4" />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 wow-dot-grid" />

        {/* Floating glass icon cards */}
        <div className="wow-float-icon wow-float-icon-1 absolute top-[17%] left-[4%] hidden xl:flex">
          <BookOpen className="w-7 h-7 text-violet-400" />
        </div>
        <div className="wow-float-icon wow-float-icon-2 absolute top-[30%] right-[5%] hidden xl:flex">
          <Award className="w-6 h-6 text-blue-400" />
        </div>
        <div className="wow-float-icon wow-float-icon-3 absolute top-[60%] left-[3%] hidden xl:flex">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="wow-float-icon wow-float-icon-4 absolute top-[70%] right-[4%] hidden xl:flex">
          <Star className="w-6 h-6 text-pink-400" />
        </div>
        <div className="wow-float-icon wow-float-icon-5 absolute top-[11%] right-[18%] hidden xl:flex">
          <TrendingUp className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="wow-float-icon wow-float-icon-5 absolute top-[50%] right-[12%] hidden xl:flex" style={{ animationDelay: '3s' }}>
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>

        {/* Main content */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-24 md:py-32">

          {/* Platform badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-8"
            style={{
              background: 'rgba(124,58,237,0.22)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(124,58,237,0.5)',
              color: '#c4b5fd',
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            O'zbekistonning zamonaviy ta'lim platformasi
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>

          {/* Main title */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15 }}
            className="mb-6"
          >
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none mb-3"
              data-testid="text-hero-title"
            >
              Zamonaviy-EDU
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none wow-shimmer-text">
              Zamonaviy Ta'lim
            </h2>
          </motion.div>

          {/* Animated gradient divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="wow-gradient-line w-40 h-1 rounded-full mx-auto mb-8"
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.68)' }}
          >
            Professional zamonaviy video darslar.
            <br />
            Bilimingizni oshiring va kelajagingizni yarating!
          </motion.p>

          {/* Glassmorphism search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.68 }}
            className="w-full max-w-2xl mx-auto mb-8"
          >
            <div
              className="relative flex items-center p-2 rounded-2xl shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Search className="absolute left-5 w-5 h-5 pointer-events-none flex-shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }} />
              <input
                type="text"
                placeholder="Kurs qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 bg-transparent pl-12 pr-3 py-3 text-white placeholder:text-white/40 outline-none text-base"
                data-testid="input-search"
              />
              <button
                onClick={() => document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Qidirish</span>
              </button>
            </div>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.82 }}
            className="flex flex-wrap gap-4 justify-center mb-16"
          >
            <button
              onClick={() => {
                setSearchQuery("");
                document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)',
                boxShadow: '0 0 40px rgba(124,58,237,0.4), 0 8px 32px rgba(0,0,0,0.3)',
              }}
              data-testid="button-explore"
            >
              Kurslarni Ko'rish
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.98 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full mx-auto"
          >
            {[
              { Icon: Users,    value: `${courses?.reduce((s, c) => s + (c.enrollmentsCount || 0), 0) || 0}+`, label: 'Talabalar',  color: '#7c3aed' },
              { Icon: BookOpen, value: `${courses?.length || 0}`,                                              label: 'Kurslar',    color: '#2563eb' },
              { Icon: Star,     value: '4.9★',                                                                 label: 'Reyting',    color: '#f59e0b' },
              { Icon: Award,    value: '100%',                                                                 label: 'Sertifikat', color: '#06b6d4' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.1 + i * 0.08 }}
                className="flex flex-col items-center p-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: `${stat.color}22` }}
                >
                  <stat.Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="relative flex flex-col items-center pb-10 gap-2">
          <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Pastga suring</div>
          <ChevronDown className="w-5 h-5 animate-bounce" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
      </section>

      {/* Courses Grid */}
      <div
        id="courses-section"
        className="relative overflow-x-clip"
        style={{ background: "linear-gradient(160deg, #0a0520 0%, #0d1440 50%, #0a0520 100%)" }}
      >
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Aurora blobs */}
        <div
          className="absolute top-10 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-10 left-0 w-[500px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", filter: "blur(60px)", transform: "translate(-50%,-50%)" }}
        />
        {/* Top separator gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none wow-header-border"
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="wow-badge mb-4" data-testid="badge-courses-label">
              <BookOpen className="w-4 h-4" />
              <span>Bizning Kurslar</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 wow-section-title" data-testid="text-courses-header">Mavjud Kurslar</h2>
            <p className="max-w-2xl mx-auto text-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
              O'zingizga mos kursni tanlang va bugun bilim olishni boshlang
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
                style={{
                  background: "rgba(124,58,237,0.20)",
                  border: "1px solid rgba(124,58,237,0.45)",
                  color: "rgba(167,139,250,1)",
                }}
                data-testid="badge-course-count"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {courses?.length || 0} ta kurs mavjud
              </div>
              {(selectedCategory || selectedLevel || priceRange) && (
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setSelectedLevel("");
                    setPriceRange("");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105"
                  style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)" }}
                  data-testid="button-clear-all-filters"
                >
                  <X className="w-3 h-3" />
                  Tozalash
                </button>
              )}
            </div>
          </motion.div>

          {/* WOW Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            {/* Gradient border wrapper */}
            <div
              className="rounded-2xl p-px"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(37,99,235,0.3), rgba(6,182,212,0.3), rgba(236,72,153,0.2))",
              }}
            >
              <div
                className="rounded-2xl p-6 space-y-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                {/* CEFR Levels */}
                {languageLevels && languageLevels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(124,58,237,0.25)" }}
                      >
                        <GraduationCap className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                      </div>
                      <span className="text-sm font-bold tracking-wide" style={{ color: "rgba(167,139,250,0.9)" }}>
                        Til Darajasi (CEFR)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedLevel("")}
                        data-testid="filter-level-all"
                        className="px-4 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        style={
                          !selectedLevel
                            ? {
                                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                                color: "#fff",
                                boxShadow: "0 0 16px rgba(124,58,237,0.5)",
                              }
                            : {
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.7)",
                                border: "1px solid rgba(255,255,255,0.12)",
                              }
                        }
                      >
                        Barchasi
                      </button>
                      {languageLevels.map((level) => {
                        const active = selectedLevel === level.id;
                        return (
                          <button
                            key={level.id}
                            onClick={() => setSelectedLevel(active ? "" : level.id)}
                            aria-pressed={active}
                            data-testid={`filter-level-${level.id}`}
                            className="px-4 py-1.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                            style={
                              active
                                ? {
                                    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                                    color: "#fff",
                                    boxShadow: "0 0 16px rgba(124,58,237,0.5)",
                                  }
                                : {
                                    background: "rgba(255,255,255,0.06)",
                                    color: "rgba(255,255,255,0.7)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                  }
                            }
                          >
                            <span className="font-black">{level.code}</span>
                            {level.name && (
                              <span className="text-xs opacity-70 ml-0.5">{level.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
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
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="aspect-video animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="h-5 rounded-lg w-4/5 animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-4 rounded-lg w-2/3 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: "rgba(124,58,237,0.2)" }} />
                      <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: "rgba(37,99,235,0.2)" }} />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-7 w-24 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-9 w-28 rounded-lg animate-pulse" style={{ background: "rgba(124,58,237,0.25)" }} />
                    </div>
                  </div>
                </div>
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
                        className="rounded-2xl overflow-hidden border-2 border-amber-400 bg-card card-7d-amber"
                        data-testid={`card-course-${course.id}`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 flex items-center justify-center overflow-hidden">
                          {isNew && (
                            <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                              <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                                <div className="text-[10px]">YANGI{daysAgo === 0 ? "" : ` (${daysAgo}k)`}</div>
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">BEPUL</div>
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={course.title} className="w-full h-full object-cover" loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <BookOpen className="w-14 h-14 text-amber-500" />
                          )}
                        </div>
                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          {/* Title + Author */}
                          <div>
                            <h3 className="font-bold text-base line-clamp-2 leading-snug">{course.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Muallif:</span> {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}
                            </p>
                          </div>
                          {/* 3D benefit strip */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-blue-50 to-blue-100/70 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30 shadow-[0_3px_0_0_rgba(59,130,246,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_4px_10px_rgba(59,130,246,0.4)] flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 text-white fill-white" />
                              </div>
                              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 text-center leading-tight">Video</p>
                            </div>
                            {!(course as any).isFree && (
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-green-50 to-green-100/70 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30 shadow-[0_3px_0_0_rgba(34,197,94,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-[0_4px_10px_rgba(34,197,94,0.4)] flex items-center justify-center">
                                <Clock className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-[10px] font-semibold text-green-700 dark:text-green-300 text-center leading-tight">{(course as any).subscriptionDays || 30} kun</p>
                            </div>
                            )}
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-purple-50 to-purple-100/70 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200/50 dark:border-purple-700/30 shadow-[0_3px_0_0_rgba(168,85,247,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_4px_10px_rgba(168,85,247,0.4)] flex items-center justify-center">
                                <Award className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 text-center leading-tight">Sertifikat</p>
                            </div>
                          </div>
                          {/* Rating + talabalar */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{course.enrollmentsCount} talaba</span></div>
                            <div className="flex items-center gap-1"><StarRating rating={course.averageRating || 0} size={12} showValue={true} /><span>({course.totalRatings || 0})</span></div>
                          </div>
                          {/* BEPUL price */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl px-3 py-2 border border-green-200 dark:border-green-700">
                            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Narxi:</span>
                            <span className="text-lg font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">BEPUL</span>
                          </div>
                          {/* 3D Action Buttons */}
                          <button
                            onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'spin', 650); setTimeout(() => setDetailCourse(course), 160); }}
                            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_5px_0_0_#92400e,0_7px_14px_rgba(180,83,9,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#92400e] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1.5"
                            data-testid={`button-about-${course.id}`}
                          >
                            <span className="hand-btn-hint" aria-hidden="true">👉</span><span className="ic"><Info className="w-4 h-4" /></span>
                            Kurs haqida
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'pop', 550); setTimeout(() => setSelectedCourseForLessons(course), 160); }}
                              className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_5px_0_0_#1e3a8a,0_7px_14px_rgba(30,58,138,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#1e3a8a] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1"
                              data-testid={`button-view-lessons-${course.id}`}
                            >
                              <span className="ic"><Play className="w-3.5 h-3.5 fill-white" /></span>
                              Darslar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); doAnim(e.currentTarget, 'shoot', 500); window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer"); }}
                              className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-green-400 to-green-600 shadow-[0_5px_0_0_#166534,0_7px_14px_rgba(22,101,52,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#166534] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1"
                              data-testid={`button-enroll-${course.id}`}
                            >
                              <span className="ic"><ArrowRight className="w-4 h-4" /></span>
                              Yozilish
                            </button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ) : discountPercent > 0 ? (
                    <div className={`p-[3px] bg-gradient-to-br ${gradient} rounded-xl card-7d-gradient`}>
                      <Card
                        className="border-0 rounded-xl bg-background"
                        data-testid={`card-course-${course.id}`}
                      >
                        {/* Thumbnail with Sale Badge & New Ribbon */}
                        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-t-xl overflow-hidden">
                          {isNew && (
                            <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                              <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                                <div className="text-[10px]">YANGI{daysAgo === 0 ? "" : ` (${daysAgo}k)`}</div>
                              </div>
                            </div>
                          )}
                          <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg">-{discountPercent}%</span>
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={course.title} className="w-full h-full object-cover" loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <BookOpen className="w-14 h-14 text-muted-foreground" />
                          )}
                        </div>
                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-bold text-base line-clamp-2 leading-snug">{course.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Muallif:</span> {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-blue-50 to-blue-100/70 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30 shadow-[0_3px_0_0_rgba(59,130,246,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_4px_10px_rgba(59,130,246,0.4)] flex items-center justify-center"><Play className="w-3.5 h-3.5 text-white fill-white" /></div>
                              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 text-center leading-tight">Video</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-green-50 to-green-100/70 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30 shadow-[0_3px_0_0_rgba(34,197,94,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-[0_4px_10px_rgba(34,197,94,0.4)] flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-white" /></div>
                              <p className="text-[10px] font-semibold text-green-700 dark:text-green-300 text-center leading-tight">{(course as any).subscriptionDays || 30} kun</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-purple-50 to-purple-100/70 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200/50 dark:border-purple-700/30 shadow-[0_3px_0_0_rgba(168,85,247,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_4px_10px_rgba(168,85,247,0.4)] flex items-center justify-center"><Award className="w-3.5 h-3.5 text-white" /></div>
                              <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 text-center leading-tight">Sertifikat</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{course.enrollmentsCount} talaba</span></div>
                            <div className="flex items-center gap-1"><StarRating rating={course.averageRating || 0} size={12} showValue={true} /><span>({course.totalRatings || 0})</span></div>
                          </div>
                          {/* Price with discount */}
                          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                            <span className="text-lg font-black text-foreground">{formatPrice(displayPrice.toString())}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(basePrice.toString())}</span>
                            <span className="ml-auto text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">-{discountPercent}%</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'spin', 650); setTimeout(() => setDetailCourse(course), 160); }} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_5px_0_0_#92400e,0_7px_14px_rgba(180,83,9,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#92400e] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1.5" data-testid={`button-about-${course.id}`}><span className="hand-btn-hint" aria-hidden="true">👉</span><span className="ic"><Info className="w-4 h-4" /></span>Kurs haqida</button>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'pop', 550); setTimeout(() => setSelectedCourseForLessons(course), 160); }} className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_5px_0_0_#1e3a8a,0_7px_14px_rgba(30,58,138,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#1e3a8a] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1" data-testid={`button-view-lessons-${course.id}`}><span className="ic"><Play className="w-3.5 h-3.5 fill-white" /></span>Darslar</button>
                            <button onClick={(e) => { e.stopPropagation(); doAnim(e.currentTarget, 'shoot', 500); window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer"); }} className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-green-400 to-green-600 shadow-[0_5px_0_0_#166534,0_7px_14px_rgba(22,101,52,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#166534] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1" data-testid={`button-enroll-${course.id}`}><span className="ic"><ArrowRight className="w-4 h-4" /></span>Yozilish</button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <>
                      {/* Oddiy karta (chegirmasiz) */}
                      <Card className="rounded-xl overflow-hidden card-7d" data-testid={`card-course-${course.id}`}>
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden">
                          {isNew && (
                            <div className="absolute top-0 left-0 z-20 w-24 h-24 overflow-hidden">
                              <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-28px] top-[18px] w-[130px] shadow-md">
                                <div className="text-[10px]">YANGI{daysAgo === 0 ? "" : ` (${daysAgo}k)`}</div>
                              </div>
                            </div>
                          )}
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={course.title} className="w-full h-full object-cover" loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <BookOpen className="w-14 h-14 text-muted-foreground" />
                          )}
                        </div>
                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-bold text-base line-clamp-2 leading-snug">{course.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Muallif:</span> {(course as any).author || `${course.instructor.firstName} ${course.instructor.lastName}`}</p>
                          </div>
                          {/* 3D benefit strip */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-blue-50 to-blue-100/70 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30 shadow-[0_3px_0_0_rgba(59,130,246,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_4px_10px_rgba(59,130,246,0.4)] flex items-center justify-center"><Play className="w-3.5 h-3.5 text-white fill-white" /></div>
                              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 text-center leading-tight">Video</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-green-50 to-green-100/70 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30 shadow-[0_3px_0_0_rgba(34,197,94,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-[0_4px_10px_rgba(34,197,94,0.4)] flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-white" /></div>
                              <p className="text-[10px] font-semibold text-green-700 dark:text-green-300 text-center leading-tight">{(course as any).subscriptionDays || 30} kun</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg p-2 bg-gradient-to-b from-purple-50 to-purple-100/70 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200/50 dark:border-purple-700/30 shadow-[0_3px_0_0_rgba(168,85,247,0.25)]">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_4px_10px_rgba(168,85,247,0.4)] flex items-center justify-center"><Award className="w-3.5 h-3.5 text-white" /></div>
                              <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 text-center leading-tight">Sertifikat</p>
                            </div>
                          </div>
                          {/* Rating + talabalar */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{course.enrollmentsCount} talaba</span></div>
                            <div className="flex items-center gap-1"><StarRating rating={course.averageRating || 0} size={12} showValue={true} /><span>({course.totalRatings || 0})</span></div>
                          </div>
                          {/* Price */}
                          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                            <span className="text-xs text-muted-foreground font-medium">Narxi:</span>
                            <span className="text-lg font-black text-foreground ml-auto">{formatPrice(displayPrice.toString())}</span>
                          </div>
                          {/* 3D Buttons */}
                          <button onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'spin', 650); setTimeout(() => setDetailCourse(course), 160); }} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_5px_0_0_#92400e,0_7px_14px_rgba(180,83,9,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#92400e] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1.5" data-testid={`button-about-${course.id}`}><span className="hand-btn-hint" aria-hidden="true">👉</span><span className="ic"><Info className="w-4 h-4" /></span>Kurs haqida</button>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={(e) => { e.stopPropagation(); const b = e.currentTarget; doAnim(b, 'pop', 550); setTimeout(() => setSelectedCourseForLessons(course), 160); }} className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_5px_0_0_#1e3a8a,0_7px_14px_rgba(30,58,138,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#1e3a8a] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1" data-testid={`button-view-lessons-${course.id}`}><span className="ic"><Play className="w-3.5 h-3.5 fill-white" /></span>Darslar</button>
                            <button onClick={(e) => { e.stopPropagation(); doAnim(e.currentTarget, 'shoot', 500); window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer"); }} className="py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-green-400 to-green-600 shadow-[0_5px_0_0_#166534,0_7px_14px_rgba(22,101,52,0.3)] hover:brightness-105 active:shadow-[0_2px_0_0_#166534] active:translate-y-[3px] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1" data-testid={`button-enroll-${course.id}`}><span className="ic"><ArrowRight className="w-4 h-4" /></span>Yozilish</button>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
          </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.20)", border: "1px solid rgba(124,58,237,0.35)" }}
            >
              <BookOpen className="w-10 h-10" style={{ color: "#a78bfa" }} />
            </div>
            <h3 className="text-2xl font-black mb-3" style={{ color: "#fff" }}>Kurslar topilmadi</h3>
            <p className="mb-6 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Qidiruv parametrlarini o'zgartiring yoki filterlarni tozalang
            </p>
            <button
              onClick={() => { setSelectedCategory(""); setSelectedLevel(""); setPriceRange(""); setSearchQuery(""); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 24px rgba(124,58,237,0.45)" }}
            >
              <X className="w-4 h-4" />
              Filterlarni tozalash
            </button>
          </motion.div>
        )}
        </div>
      </div>

      {/* Testimonials Section */}
      {testimonials && testimonials.length > 0 && (
        <div className="relative overflow-hidden">
          {/* Smooth transition from dark courses section */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to bottom, #0a0520, transparent)" }} />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-background to-blue-50/60 dark:from-violet-950/20 dark:via-background dark:to-blue-950/20 pointer-events-none" />
          <div className="absolute top-10 left-[10%] w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.07)' }} />
          <div className="absolute bottom-10 right-[10%] w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.07)' }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="wow-badge mb-4" data-testid="badge-testimonials-label">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>Talabalar Fikrlari</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4 wow-section-title" data-testid="text-testimonials-header">
                Talabalarimiz Nima Deyishadi
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Minglab talabalar bizga ishonishdi va karyeralarini qurishdi
              </p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((testimonial, idx) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                >
                  <Card className="wow-card-glow h-full" data-testid={`card-testimonial-${testimonial.id}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                        >
                          {testimonial.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold">{testimonial.studentName}</h4>
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
                      <p className="text-sm text-muted-foreground italic leading-relaxed">
                        "{testimonial.content}"
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
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
                <div className="wow-badge mb-4" data-testid="badge-certificates-label">
                  <Award className="w-4 h-4" />
                  <span>Sertifikatlar</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 wow-section-title" data-testid="text-certificates-header">Litsenziya va Guvohnomalar</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
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
      {/* ── ABOUT SECTION ── */}
      {getSetting("about_us") && (
        <div
          id="about-section"
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0a0520 0%, #0d1440 100%)" }}
        >
          {/* Aurora orbs */}
          <div className="wow-blob wow-blob-1 absolute" style={{ top: "10%", left: "5%", width: 320, height: 320, background: "rgba(124,58,237,0.15)", filter: "blur(70px)" }} />
          <div className="wow-blob wow-blob-2 absolute" style={{ bottom: "5%", right: "8%", width: 260, height: 260, background: "rgba(6,182,212,0.12)", filter: "blur(60px)" }} />
          {/* Dot grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="wow-badge mb-5" data-testid="badge-about-label">
                <Users className="w-4 h-4" />
                <span>Biz Haqimizda</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-8 wow-section-title" data-testid="text-about-header">
                Zamonaviy-EDU
              </h2>
              {/* Glassmorphic text panel */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 24,
                  padding: "32px 40px",
                  backdropFilter: "blur(12px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top gradient shimmer */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(6,182,212,0.6), transparent)" }} />
                <p
                  className="text-lg whitespace-pre-line leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                  data-testid="text-about-content"
                >
                  {getSetting("about_us")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── CONTACT SECTION ── */}
      {(getSetting("contact_email") || getSetting("contact_phone") || getSetting("contact_address") || getSetting("contact_telegram")) && (
        <div
          id="contact-section"
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0d1440 0%, #0a0520 100%)" }}
        >
          {/* Aurora orbs */}
          <div className="wow-blob wow-blob-3 absolute" style={{ top: "15%", right: "5%", width: 300, height: 300, background: "rgba(37,99,235,0.15)", filter: "blur(70px)" }} />
          <div className="wow-blob wow-blob-4 absolute" style={{ bottom: "10%", left: "10%", width: 240, height: 240, background: "rgba(236,72,153,0.10)", filter: "blur(60px)" }} />
          {/* Dot grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="wow-badge mb-5" data-testid="badge-contact-label">
                <Mail className="w-4 h-4" />
                <span>Aloqa</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4 wow-section-title" data-testid="text-contact-header">
                Biz bilan Bog'laning
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)" }} className="max-w-2xl mx-auto text-lg">
                Savollaringiz bormi? Biz sizga yordam berishga tayyormiz!
              </p>
            </motion.div>

            {/* Contact cards grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {[
                getSetting("contact_email") && {
                  href: `mailto:${getSetting("contact_email")}`,
                  icon: Mail, label: "Email", value: getSetting("contact_email"),
                  from: "#7c3aed", to: "#4f46e5", shadow: "#3b0764", glow: "rgba(124,58,237,0.4)",
                  testId: "link-contact-email", external: false,
                },
                getSetting("contact_phone") && {
                  href: `tel:${getSetting("contact_phone").replace(/\s/g, "")}`,
                  icon: Phone, label: "Telefon", value: getSetting("contact_phone"),
                  from: "#2563eb", to: "#1d4ed8", shadow: "#1e3a8a", glow: "rgba(37,99,235,0.4)",
                  testId: "link-contact-phone", external: false,
                },
                getSetting("contact_telegram") && {
                  href: getSetting("contact_telegram"),
                  icon: Send, label: "Telegram", value: "Guruhga qo'shiling",
                  from: "#06b6d4", to: "#0891b2", shadow: "#164e63", glow: "rgba(6,182,212,0.4)",
                  testId: "link-contact-telegram", external: true,
                },
                getSetting("contact_address") && {
                  href: null,
                  icon: MapPin, label: "Manzil", value: getSetting("contact_address"),
                  from: "#ec4899", to: "#db2777", shadow: "#831843", glow: "rgba(236,72,153,0.4)",
                  testId: "card-contact-address", external: false,
                },
              ].filter(Boolean).map((card: any, i: number) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{ position: "relative" }}
                >
                  {/* Animated gradient border */}
                  <div style={{
                    position: "absolute", inset: -1.5, borderRadius: 22, zIndex: 0,
                    background: `linear-gradient(135deg, ${card.from}, ${card.to}, ${card.from})`,
                    backgroundSize: "200% 200%",
                    animation: "wow-grad-line 4s ease infinite",
                    animationDelay: `${i * 0.7}s`,
                    opacity: 0.6,
                  }} />
                  {card.href ? (
                    <a
                      href={card.href}
                      target={card.external ? "_blank" : undefined}
                      rel={card.external ? "noopener noreferrer" : undefined}
                      data-testid={card.testId}
                      style={{
                        display: "block", position: "relative", zIndex: 1,
                        background: "linear-gradient(160deg, rgba(20,10,50,0.92), rgba(10,5,32,0.95))",
                        borderRadius: 20, padding: "28px 20px", textAlign: "center",
                        textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
                        backdropFilter: "blur(12px)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow = `0 20px 40px ${card.glow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${card.from}, ${card.to})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 8px 24px ${card.glow}` }}>
                        <card.icon style={{ width: 24, height: 24, color: "#fff" }} />
                      </div>
                      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{card.label}</h3>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, wordBreak: "break-all" }}>{card.value}</p>
                      {card.external && <ExternalLink style={{ width: 12, height: 12, color: "rgba(255,255,255,0.35)", margin: "6px auto 0", display: "block" }} />}
                    </a>
                  ) : (
                    <div
                      data-testid={card.testId}
                      style={{
                        position: "relative", zIndex: 1,
                        background: "linear-gradient(160deg, rgba(20,10,50,0.92), rgba(10,5,32,0.95))",
                        borderRadius: 20, padding: "28px 20px", textAlign: "center",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${card.from}, ${card.to})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 8px 24px ${card.glow}` }}>
                        <card.icon style={{ width: 24, height: 24, color: "#fff" }} />
                      </div>
                      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{card.label}</h3>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, wordBreak: "break-all" }}>{card.value}</p>
                    </div>
                  )}
                </motion.div>
              ))}
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

      {/* Course Detail Modal - 3D dizayn */}
      <Dialog open={detailCourse !== null} onOpenChange={() => setDetailCourse(null)}>
        <DialogContent className="w-full max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{detailCourse?.title || "Kurs ma'lumotlari"}</DialogTitle>
          </DialogHeader>
          {detailCourse && (() => {
            const dc = detailCourse;
            const discP = dc.discountPercentage && dc.discountPercentage > 0 ? dc.discountPercentage : 0;
            const baseP = Number(dc.price);
            const dispP = discP > 0 ? baseP * (1 - discP / 100) : baseP;

            let thumbUrl = dc.thumbnailUrl;
            if (thumbUrl && thumbUrl.includes('drive.google.com')) {
              const m = thumbUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
              if (m) thumbUrl = `https://lh3.googleusercontent.com/d/${m[1]}`;
            }

            const formatPrice = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

            return (
              <div className="flex flex-col max-h-[90vh] overflow-y-auto">
                {/* Hero thumbnail with gradient overlay */}
                <div className="relative aspect-video w-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={dc.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-20 h-20 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {(dc as any).isFree && (
                      <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">BEPUL</span>
                    )}
                    {discP > 0 && (
                      <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">-{discP}%</span>
                    )}
                    {dc.category && (
                      <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">{dc.category}</span>
                    )}
                  </div>
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">{dc.title}</h2>
                    <p className="text-white/80 text-sm mt-1 drop-shadow">
                      {(dc as any).author || `${dc.instructor.firstName} ${dc.instructor.lastName}`}
                    </p>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setDetailCourse(null)}
                    className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
                    data-testid="button-close-detail"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Rating + Enrollments row */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={dc.averageRating || 0} size={14} showValue={true} />
                      <span className="text-muted-foreground">({dc.totalRatings || 0})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{dc.enrollmentsCount} talaba</span>
                    </div>
                  </div>

                  {/* 3D benefit tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Tile 1 - Video darslar */}
                    <div className="flex flex-col items-center gap-2 rounded-xl p-3
                      bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20
                      border border-blue-200/60 dark:border-blue-700/40
                      shadow-[0_4px_0_0_rgba(59,130,246,0.25)] dark:shadow-[0_4px_0_0_rgba(59,130,246,0.15)]">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600
                        shadow-[0_6px_16px_rgba(59,130,246,0.45)] border border-blue-300/50
                        flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                      <p className="text-[11px] font-semibold text-center text-blue-700 dark:text-blue-300 leading-tight">Video Darslar</p>
                      <p className="text-[10px] text-blue-500/80 dark:text-blue-400/70 text-center">Online format</p>
                    </div>

                    {/* Tile 2 - Kirish muddati (only for paid courses) */}
                    {!dc.isFree && (
                    <div className="flex flex-col items-center gap-2 rounded-xl p-3
                      bg-gradient-to-b from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20
                      border border-green-200/60 dark:border-green-700/40
                      shadow-[0_4px_0_0_rgba(34,197,94,0.25)] dark:shadow-[0_4px_0_0_rgba(34,197,94,0.15)]">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-green-600
                        shadow-[0_6px_16px_rgba(34,197,94,0.45)] border border-green-300/50
                        flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[11px] font-semibold text-center text-green-700 dark:text-green-300 leading-tight">{(dc as any).subscriptionDays || 30} Kun</p>
                      <p className="text-[10px] text-green-500/80 dark:text-green-400/70 text-center">To'liq huquq</p>
                    </div>
                    )}

                    {/* Tile 3 - Sertifikat */}
                    <div className="flex flex-col items-center gap-2 rounded-xl p-3
                      bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20
                      border border-purple-200/60 dark:border-purple-700/40
                      shadow-[0_4px_0_0_rgba(168,85,247,0.25)] dark:shadow-[0_4px_0_0_rgba(168,85,247,0.15)]">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600
                        shadow-[0_6px_16px_rgba(168,85,247,0.45)] border border-purple-300/50
                        flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[11px] font-semibold text-center text-purple-700 dark:text-purple-300 leading-tight">Sertifikat</p>
                      <p className="text-[10px] text-purple-500/80 dark:text-purple-400/70 text-center">Yakunida</p>
                    </div>
                  </div>

                  {/* Description — 8D animated feature list */}
                  {dc.description && (() => {
                    const rawLines = dc.description!
                      .split(/\n|;|•/)
                      .map((l: string) => l.replace(/^[-–—*►▸▶➤➜→\s💜💛💚💙❤️🟣🔵🟢]+/u, '').trim())
                      .filter((l: string) => l.length > 1);

                    if (rawLines.length === 0) return (
                      <p className="text-sm text-muted-foreground leading-relaxed">{dc.description}</p>
                    );

                    const palettes = [
                      { from: '#7c3aed', to: '#4f46e5', glow: 'rgba(124,58,237,0.45)', shadow: '#3b0764' },
                      { from: '#2563eb', to: '#1d4ed8', glow: 'rgba(37,99,235,0.45)', shadow: '#1e3a8a' },
                      { from: '#06b6d4', to: '#0891b2', glow: 'rgba(6,182,212,0.45)', shadow: '#164e63' },
                      { from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.45)', shadow: '#064e3b' },
                      { from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.45)', shadow: '#78350f' },
                      { from: '#ec4899', to: '#db2777', glow: 'rgba(236,72,153,0.45)', shadow: '#831843' },
                    ];

                    return (
                      <div style={{ background: 'linear-gradient(135deg, #1a0e36 0%, #0d0720 100%)', borderRadius: 16, padding: '14px 14px 10px' }}>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Kurs tarkibi
                          </p>
                          {rawLines.map((line: string, i: number) => {
                            const pal = palettes[i % palettes.length];
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -18 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.32, delay: i * 0.06 }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 14px',
                                  borderRadius: 14,
                                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: `0 2px 0 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'transform 0.18s, box-shadow 0.18s',
                                }}
                                whileHover={{
                                  scale: 1.015,
                                  boxShadow: `0 4px 18px ${pal.glow}, 0 2px 0 rgba(0,0,0,0.4)`,
                                }}
                              >
                                {/* Left shimmer accent line */}
                                <div style={{
                                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                                  background: `linear-gradient(180deg, ${pal.from}, ${pal.to})`,
                                  borderRadius: '14px 0 0 14px',
                                }} />

                                {/* 7D Tick icon */}
                                <div style={{
                                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                  background: `linear-gradient(145deg, ${pal.from}, ${pal.to})`,
                                  boxShadow: `0 4px 0 0 ${pal.shadow}, 0 6px 14px ${pal.glow}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: `1px solid ${pal.from}80`,
                                }}>
                                  <CheckCircle style={{ width: 16, height: 16, color: '#fff', fill: 'none', strokeWidth: 2.5 }} />
                                </div>

                                {/* Text */}
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.45, fontWeight: 500 }}>
                                  {line}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pricing */}
                  {dc.planPricing && dc.planPricing.length > 0 ? (
                    <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tariflar</p>
                      <div className="space-y-1.5">
                        {dc.planPricing.map((pp) => (
                          <div key={pp.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{pp.plan.displayName}</span>
                            <span className="font-bold text-primary">{Number(pp.price).toLocaleString('uz-UZ')} so'm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (dc as any).isFree ? (
                    <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 text-center border border-green-200 dark:border-green-700">
                      <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">BEPUL</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{formatPrice(dispP)}</span>
                      {discP > 0 && (
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(baseP)}</span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setDetailCourse(null); setSelectedCourseForLessons(dc); }}
                      data-testid={`button-detail-view-lessons-${dc.id}`}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Darslarni Ko'rish
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => window.open("https://t.me/zamonaviytalimuz", "_blank", "noopener,noreferrer")}
                      data-testid={`button-detail-enroll-${dc.id}`}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Yozilish
                    </Button>
                  </div>

                  {/* Promo video button */}
                  {(dc as any).promoVideoUrl && (
                    <Button
                      variant="outline"
                      className="w-full border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold"
                      onClick={() => { setDetailCourse(null); setPromoVideoCourse(dc); }}
                      data-testid={`button-detail-promo-${dc.id}`}
                    >
                      <Youtube className="w-5 h-5 mr-2" />
                      Kurs haqida batafsil (Video)
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Course Lessons Modal - Ultra WOW Dark 7D Design */}
      <Dialog 
        open={selectedCourseForLessons !== null} 
        onOpenChange={() => setSelectedCourseForLessons(null)}
      >
        <DialogContent className="w-full max-w-2xl h-[100dvh] sm:h-[90vh] p-0 gap-0 border-transparent shadow-none rounded-none sm:rounded-2xl flex flex-col overflow-hidden !bg-transparent">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedCourseForLessons?.title || "Darslar"}</DialogTitle>
          </DialogHeader>

          {/* Full dark wrapper */}
          <div className="absolute inset-0 sm:rounded-2xl overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg, #0d0521 0%, #130a2e 40%, #0a1628 100%)' }}>

          {/* Ambient background orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div style={{ position:'absolute', top:-80, left:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />
            <div style={{ position:'absolute', bottom:-60, right:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
            <div style={{ position:'absolute', top:'40%', right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)' }} />
          </div>

          {/* Header */}
          <div className="relative flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
            <button
              onClick={() => setSelectedCourseForLessons(null)}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              data-testid="button-back-from-lessons"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.8)' }} />
            </button>
            <div className="flex-1 min-w-0">
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                Kurs dasturi
              </p>
              <h2 className="font-bold truncate" style={{ color: '#fff', fontSize: 15, lineHeight: 1.2 }}>
                {selectedCourseForLessons?.title}
              </h2>
            </div>
            {courseLessons && (
              <div className="flex-shrink-0 text-right">
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                  {courseLessons.length}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600 }}>dars</p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto" style={{ padding: '12px 12px 20px' }}>
            {isCourseLessonsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Yuklanmoqda...</p>
              </div>
            ) : courseLessons && courseLessons.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const wowModulePalettes = [
                    { from: '#7c3aed', to: '#4f46e5', glow: 'rgba(124,58,237,0.5)', bar: '#7c3aed', light: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)' },
                    { from: '#06b6d4', to: '#0284c7', glow: 'rgba(6,182,212,0.5)', bar: '#06b6d4', light: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
                    { from: '#ec4899', to: '#db2777', glow: 'rgba(236,72,153,0.5)', bar: '#ec4899', light: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)' },
                    { from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.5)', bar: '#10b981', light: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
                    { from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.5)', bar: '#f59e0b', light: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
                    { from: '#8b5cf6', to: '#7c3aed', glow: 'rgba(139,92,246,0.5)', bar: '#8b5cf6', light: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
                  ];

                  const WowLessonItem = ({ lesson, index, courseId }: { lesson: any; index: number; courseId: string }) => {
                    const canViewDemo = lesson.isDemo && lesson.videoUrl && lesson.videoUrl.trim() !== '';
                    return (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() => canViewDemo && openDemoLesson(lesson, courseId)}
                        data-testid={`public-lesson-${lesson.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 13px',
                          borderRadius: 14,
                          cursor: canViewDemo ? 'pointer' : 'default',
                          background: canViewDemo
                            ? 'linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(245,158,11,0.07) 100%)'
                            : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                          border: canViewDemo
                            ? '1px solid rgba(251,146,60,0.25)'
                            : '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        whileHover={canViewDemo ? {
                          scale: 1.01,
                          boxShadow: '0 4px 20px rgba(251,146,60,0.25)',
                        } : {}}
                        whileTap={canViewDemo ? { scale: 0.99 } : {}}
                      >
                        {/* Left accent line for demo */}
                        {canViewDemo && (
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3,
                            background:'linear-gradient(180deg, #fb923c, #f59e0b)',
                            borderRadius:'14px 0 0 14px' }} />
                        )}

                        {/* Icon */}
                        {canViewDemo ? (
                          <motion.div
                            animate={{ boxShadow: ['0 0 10px rgba(251,146,60,0.4)', '0 0 20px rgba(251,146,60,0.7)', '0 0 10px rgba(251,146,60,0.4)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                              background:'linear-gradient(145deg, #fb923c, #f59e0b)',
                              boxShadow:'0 4px 0 0 #92400e, 0 6px 14px rgba(251,146,60,0.45)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              border:'1px solid rgba(251,146,60,0.6)' }}>
                            <Play style={{ width:15, height:15, color:'#fff', fill:'#fff' }} />
                          </motion.div>
                        ) : (
                          <motion.div
                            animate={{ rotateY: [0, 8, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, delay: index * 0.3 }}
                            style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                              background:'linear-gradient(145deg, #1e1b4b, #312e81)',
                              boxShadow:'0 4px 0 0 #1e1b4b, 0 6px 14px rgba(99,102,241,0.25)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              border:'1px solid rgba(99,102,241,0.3)' }}>
                            <motion.div
                              animate={{ scale: [1, 1.08, 1] }}
                              transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                            >
                              <Lock style={{ width:15, height:15, color:'rgba(165,180,252,0.7)' }} />
                            </motion.div>
                          </motion.div>
                        )}

                        {/* Text */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, marginBottom: 2,
                            color: canViewDemo ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                          }}>
                            {lesson.title}
                          </p>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {lesson.duration && (
                              <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{lesson.duration} daqiqa</span>
                            )}
                            {lesson.pdfUrl && (
                              <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', gap:3 }}>
                                <FileText style={{ width:10, height:10 }} /> PDF
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badge */}
                        {canViewDemo ? (
                          <span style={{ fontSize:10, fontWeight:700, color:'#fb923c',
                            background:'rgba(251,146,60,0.15)', border:'1px solid rgba(251,146,60,0.35)',
                            borderRadius:6, padding:'3px 8px', flexShrink:0, letterSpacing:'0.05em' }}>
                            DEMO
                          </span>
                        ) : (
                          <span style={{ fontSize:10, fontWeight:700, color:'rgba(165,180,252,0.6)',
                            background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
                            borderRadius:6, padding:'3px 8px', flexShrink:0, letterSpacing:'0.05em' }}>
                            PREMIUM
                          </span>
                        )}
                      </motion.div>
                    );
                  };

                  if (courseModules && courseModules.length > 0) {
                    const sortedModules = [...courseModules].sort((a, b) => a.order - b.order);
                    const moduleLessons = courseLessons.filter((l: any) => l.moduleId);
                    const standaloneLessons = courseLessons.filter((l: any) => !l.moduleId);
                    let globalLessonIndex = 0;

                    return (
                      <>
                        {sortedModules.map((module, moduleIndex) => {
                          const lessonsInModule = moduleLessons
                            .filter((l: any) => l.moduleId === module.id)
                            .sort((a: any, b: any) => a.order - b.order);
                          if (lessonsInModule.length === 0) return null;

                          const pal = wowModulePalettes[moduleIndex % wowModulePalettes.length];
                          const demoCount = lessonsInModule.filter((l: any) => l.isDemo).length;
                          const startIdx = globalLessonIndex;
                          globalLessonIndex += lessonsInModule.length;

                          return (
                            <motion.div
                              key={module.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: moduleIndex * 0.08 }}
                              data-testid={`public-module-${module.id}`}
                              style={{ borderRadius: 18, overflow:'hidden',
                                background: `linear-gradient(135deg, ${pal.light} 0%, rgba(255,255,255,0.02) 100%)`,
                                border: `1px solid ${pal.border}`,
                                boxShadow: `0 4px 24px ${pal.glow.replace('0.5', '0.12')}` }}
                            >
                              {/* Module header */}
                              <div style={{ padding:'14px 16px 10px', position:'relative', overflow:'hidden' }}>
                                <div style={{ position:'absolute', top:-30, right:-20, width:100, height:100, borderRadius:'50%',
                                  background:`radial-gradient(circle, ${pal.glow.replace('0.5','0.2')} 0%, transparent 70%)` }} />

                                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                                  {/* Module number badge */}
                                  <motion.div
                                    animate={{ boxShadow: [`0 0 8px ${pal.glow}`, `0 0 16px ${pal.glow}`, `0 0 8px ${pal.glow}`] }}
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                    style={{ width:38, height:38, borderRadius:12, flexShrink:0,
                                      background:`linear-gradient(145deg, ${pal.from}, ${pal.to})`,
                                      boxShadow:`0 4px 0 0 rgba(0,0,0,0.4), 0 6px 14px ${pal.glow}`,
                                      display:'flex', alignItems:'center', justifyContent:'center',
                                      border:`1px solid ${pal.from}60` }}>
                                    <span style={{ color:'#fff', fontWeight:800, fontSize:14 }}>{moduleIndex + 1}</span>
                                  </motion.div>

                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em',
                                        color: pal.bar, textTransform:'uppercase' }}>
                                        MODUL {moduleIndex + 1}
                                      </span>
                                      {demoCount > 0 && (
                                        <span style={{ fontSize:9, fontWeight:700, color:'#fb923c',
                                          background:'rgba(251,146,60,0.15)', border:'1px solid rgba(251,146,60,0.3)',
                                          borderRadius:5, padding:'1px 6px' }}>
                                          {demoCount} demo
                                        </span>
                                      )}
                                    </div>
                                    <h3 style={{ color:'rgba(255,255,255,0.9)', fontWeight:700, fontSize:14,
                                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                      {module.title}
                                    </h3>
                                  </div>

                                  <div style={{ flexShrink:0, textAlign:'right' }}>
                                    <p style={{ color:'rgba(255,255,255,0.85)', fontWeight:800, fontSize:16, lineHeight:1 }}>
                                      {lessonsInModule.length}
                                    </p>
                                    <p style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>dars</p>
                                  </div>
                                </div>

                                {/* Animated progress bar */}
                                <div style={{ height:5, borderRadius:10, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(demoCount / lessonsInModule.length) * 100}%` }}
                                    transition={{ duration: 1, delay: moduleIndex * 0.15 + 0.3, ease: 'easeOut' }}
                                    style={{ height:'100%', borderRadius:10,
                                      background:`linear-gradient(90deg, ${pal.from}, ${pal.to})`,
                                      boxShadow:`0 0 8px ${pal.glow}` }}
                                  />
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>
                                    {demoCount} demo bepul
                                  </span>
                                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>
                                    {lessonsInModule.length - demoCount} premium
                                  </span>
                                </div>
                              </div>

                              {/* Lessons list */}
                              <div style={{ padding:'4px 10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
                                {lessonsInModule.map((lesson: any, li: number) => (
                                  <WowLessonItem
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={startIdx + li}
                                    courseId={selectedCourseForLessons!.id}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          );
                        })}

                        {standaloneLessons.length > 0 && (
                          <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'4px 0' }}>
                            {standaloneLessons.map((lesson: any, i: number) => (
                              <WowLessonItem
                                key={lesson.id}
                                lesson={lesson}
                                index={globalLessonIndex + i}
                                courseId={selectedCourseForLessons!.id}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  }

                  // No modules — flat list
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {courseLessons.map((lesson: any, i: number) => (
                        <WowLessonItem
                          key={lesson.id}
                          lesson={lesson}
                          index={i}
                          courseId={selectedCourseForLessons!.id}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ width:60, height:60, borderRadius:18,
                    background:'linear-gradient(145deg, #1e1b4b, #312e81)',
                    boxShadow:'0 8px 24px rgba(99,102,241,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}
                >
                  <BookOpen style={{ width:28, height:28, color:'rgba(165,180,252,0.6)' }} />
                </motion.div>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14 }}>Hali darslar qo'shilmagan</p>
              </div>
            )}
          </div>
          </div>{/* end: Full dark wrapper */}
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
