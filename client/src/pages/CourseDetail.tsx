import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Users, Award, Video, Lock, Play, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Lesson {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  orderIndex: number;
  isDemo: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  discountedPrice?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  enrollmentsCount: number;
  lessons: Lesson[];
  planPricing: Array<{
    id: string;
    price: string;
    plan: {
      id: string;
      name: string;
      displayName: string;
    };
  }>;
}

export default function CourseDetail() {
  const { id: courseId } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  const { data: course, isLoading } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}/public`],
    enabled: !!courseId,
  });
  
  const formatPrice = (price: string | number) => {
    return Number(price).toLocaleString('uz-UZ') + " so'm";
  };
  
  const calculateTotalDuration = (lessons: Lesson[]) => {
    const totalMinutes = lessons.reduce((acc, lesson) => acc + lesson.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} soat ${minutes} daqiqa` : `${minutes} daqiqa`;
  };
  
  const handleEnroll = () => {
    if (isAuthenticated) {
      setLocation(`/checkout/${courseId}`);
    } else {
      setLocation(`/login`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Ma'lumot topilmadi</h1>
        <Button onClick={() => setLocation("/")}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Bosh sahifaga qaytish
        </Button>
      </div>
    );
  }
  
  // Auto-convert Google Drive thumbnail URL
  let thumbnailUrl = course.thumbnailUrl || course.imageUrl;
  if (thumbnailUrl && thumbnailUrl.includes('drive.google.com/file/d/')) {
    const match = thumbnailUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      thumbnailUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Orqaga
          </Button>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Course Info */}
            <div>
              <div className="flex items-start gap-3 mb-4">
                <h1 className="text-3xl font-bold">{course.title}</h1>
                {course.category && (
                  <Badge variant="secondary" className="mt-1">
                    {course.category}
                  </Badge>
                )}
              </div>
              
              <p className="text-lg text-muted-foreground mb-6">
                {course.description}
              </p>
              
              <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{course.enrollmentsCount} talaba</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span>{course.lessons?.length || 0} dars</span>
                </div>
                {course.lessons && course.lessons.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{calculateTotalDuration(course.lessons)}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium mb-1">O'qituvchi</p>
                <p className="text-lg">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
              </div>
            </div>
            
            {/* Course Image & Pricing */}
            <div>
              <Card className="overflow-hidden">
                {thumbnailUrl ? (
                  <div className="h-64 bg-gradient-to-br from-primary/20 to-primary/5">
                    <img
                      src={thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}
                
                <CardContent className="p-6">
                  {/* Pricing */}
                  {course.planPricing && course.planPricing.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Tariflar:</h3>
                      <div className="space-y-2">
                        {course.planPricing.map((pricing) => (
                          <div
                            key={pricing.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            data-testid={`pricing-${pricing.plan.name}`}
                          >
                            <span className="font-medium">{pricing.plan.displayName}</span>
                            <span className="text-lg font-bold text-primary">
                              {formatPrice(pricing.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Narxi</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(course.discountedPrice || course.price)}
                      </p>
                      {course.discountedPrice && course.price && (
                        <p className="text-sm text-muted-foreground line-through mt-1">
                          {formatPrice(course.price)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="p-6 pt-0">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleEnroll}
                    data-testid="button-enroll"
                  >
                    {isAuthenticated ? "Ro'yxatdan o'tish" : "Kirish va Ro'yxatdan o'tish"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="lessons">Darslar</TabsTrigger>
            <TabsTrigger value="about">Kurs haqida</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lessons">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Kurs dasturi</h2>
                <p className="text-sm text-muted-foreground">
                  {course.lessons?.length || 0} ta dars mavjud
                </p>
              </CardHeader>
              <CardContent>
                {course.lessons && course.lessons.length > 0 ? (
                  <div className="space-y-3">
                    {course.lessons
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            lesson.isDemo
                              ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800'
                              : 'bg-muted/30'
                          }`}
                          data-testid={`lesson-${lesson.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {lesson.isDemo ? (
                                <Play className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              ) : (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">
                                {index + 1}. {lesson.title}
                              </h3>
                              {lesson.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {lesson.isDemo && (
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                                Demo
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {lesson.durationMinutes} daqiqa
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Darslar ro'yxati hali qo'shilmagan
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Kurs haqida</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Ta'rif</h3>
                  <p className="text-muted-foreground">{course.description}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">O'qituvchi</h3>
                  <p className="text-muted-foreground">
                    {course.instructor.firstName} {course.instructor.lastName}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Statistika</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Talabalar soni</p>
                      <p className="text-lg font-semibold">{course.enrollmentsCount}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Darslar soni</p>
                      <p className="text-lg font-semibold">{course.lessons?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}