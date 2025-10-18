import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, BookOpen, Users, Award, TrendingUp, Star, Mail, Phone, MapPin, Send, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Course, User, SiteSetting, Testimonial } from "@shared/schema";

type PublicCourse = Course & {
  instructor: User;
  enrollmentsCount: number;
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

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

  const { data: courses, isLoading } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public", searchQuery, selectedCategory, priceRange],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const url = `/api/courses/public${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch courses");
      return response.json();
    },
  });

  // Fetch site settings
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const response = await fetch("/api/site-settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Fetch testimonials
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    queryFn: async () => {
      const response = await fetch("/api/testimonials");
      if (!response.ok) throw new Error("Failed to fetch testimonials");
      return response.json();
    },
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
    { value: "Language", label: "🌍 Tillar" },
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
              O'zbekistondagi Eng Yaxshi
              <br />
              <span className="text-primary">Video Kurslar Platformasi</span>
            </motion.h1>
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Professional o'qituvchilardan zamonaviy video darslar.
              <br />
              Kasb-hunaringizni oshiring va kelajagingizni yarating!
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
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-get-started"
              >
                Boshlash
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

      {/* Stats Section */}
      <div className="border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <BookOpen className="w-10 h-10 mx-auto text-primary mb-2" />
              <div className="text-3xl font-bold">{courses?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Video Kurslar</div>
            </div>
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto text-primary mb-2" />
              <div className="text-3xl font-bold">
                {courses?.reduce((sum, c) => sum + c.enrollmentsCount, 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Aktiv Talabalar</div>
            </div>
            <div className="text-center">
              <Award className="w-10 h-10 mx-auto text-primary mb-2" />
              <div className="text-3xl font-bold">
                {new Set(courses?.map(c => c.instructorId)).size || 0}
              </div>
              <div className="text-sm text-muted-foreground">Professional O'qituvchilar</div>
            </div>
            <div className="text-center">
              <TrendingUp className="w-10 h-10 mx-auto text-primary mb-2" />
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm text-muted-foreground">O'rtacha Reyting</div>
            </div>
          </div>
        </div>
      </div>

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
                <div className="h-48 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const discountPercent = calculateDiscount(course.originalPrice, course.discountedPrice);
              const displayPrice = course.discountedPrice || course.price;

              return (
                <Card
                  key={course.id}
                  className="hover-elevate transition-all cursor-pointer"
                  data-testid={`card-course-${course.id}`}
                  onClick={() => setLocation(`/checkout/${course.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-b">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
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
                      {course.instructor.firstName} {course.instructor.lastName}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description || "Kurs tavsifi yo'q"}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{course.enrollmentsCount} talaba</span>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {formatPrice(displayPrice)}
                        </span>
                        {discountPercent && (
                          <Badge variant="destructive" className="text-xs">
                            -{discountPercent}%
                          </Badge>
                        )}
                      </div>
                      {course.originalPrice && course.discountedPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(course.originalPrice)}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = "/api/login";
                      }}
                      data-testid={`button-enroll-${course.id}`}
                    >
                      Yozilish
                    </Button>
                  </CardFooter>
                </Card>
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
        const certificateList = getSetting("certificate_urls").split('\n').filter(url => url.trim());
        
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
                {certificateList.concat(certificateList, certificateList).map((url, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-64 h-80 rounded-lg overflow-hidden border bg-card shadow-lg"
                    data-testid={`certificate-${index % certificateList.length}`}
                  >
                    <img
                      src={url.trim()}
                      alt={`Sertifikat ${(index % certificateList.length) + 1}`}
                      className="w-full h-full object-contain bg-white"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/256x320?text=Sertifikat";
                      }}
                    />
                  </div>
                ))}
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

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Video Kurslar Platformasi. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}
