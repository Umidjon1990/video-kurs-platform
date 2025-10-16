import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCard } from "@/components/CourseCard";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlayCircle } from "lucide-react";
import type { Course, Lesson } from "@shared/schema";

export default function StudentCourses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCourseForDemo, setSelectedCourseForDemo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: allCourses, isLoading: allCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: isAuthenticated,
  });

  const { data: enrolledCourses, isLoading: enrolledCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/student/enrolled-courses"],
    enabled: isAuthenticated,
  });

  const { data: demoLessons } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", selectedCourseForDemo, "demo-lessons"],
    enabled: !!selectedCourseForDemo,
  });

  const enrolledCourseIds = new Set(enrolledCourses?.map(c => c.id) || []);

  const handleEnroll = (courseId: string) => {
    setLocation(`/checkout/${courseId}`);
  };

  const handleViewCourse = (courseId: string) => {
    setLocation(`/learn/${courseId}`);
  };

  const handleViewDemo = (courseId: string) => {
    setSelectedCourseForDemo(courseId);
  };

  if (authLoading || allCoursesLoading || enrolledCoursesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-student-title">O'quv Platformasi</h1>
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Chiqish
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-courses">Barcha Kurslar</TabsTrigger>
            <TabsTrigger value="enrolled" data-testid="tab-my-courses">Mening Kurslarim</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <h2 className="text-3xl font-bold">Barcha Kurslar</h2>
            {allCourses && allCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hozircha kurslar yo'q</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allCourses?.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEnroll={handleEnroll}
                    onViewDemo={handleViewDemo}
                    isEnrolled={enrolledCourseIds.has(course.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled" className="space-y-4">
            <h2 className="text-3xl font-bold">Mening Kurslarim</h2>
            {enrolledCourses && enrolledCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hali hech qanday kursga yozilmagansiz</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses?.map((course) => (
                  <div key={course.id} onClick={() => handleViewCourse(course.id)} className="cursor-pointer">
                    <CourseCard 
                      course={course} 
                      onViewDemo={handleViewDemo}
                      isEnrolled={true} 
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Demo Lessons Dialog */}
      <Dialog open={!!selectedCourseForDemo} onOpenChange={(open) => !open && setSelectedCourseForDemo(null)}>
        <DialogContent data-testid="dialog-demo-lessons">
          <DialogHeader>
            <DialogTitle>Sinov Darslari</DialogTitle>
            <DialogDescription>
              Kursning bepul sinov darslarini ko'ring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {demoLessons && demoLessons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Hali sinov darslari yo'q</p>
            ) : (
              demoLessons?.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedCourseForDemo(null);
                    setLocation(`/learn/${selectedCourseForDemo}`);
                  }}
                  data-testid={`demo-lesson-${lesson.id}`}
                >
                  <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{lesson.title}</h4>
                    {lesson.duration && (
                      <p className="text-xs text-muted-foreground">{lesson.duration} daqiqa</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Demo
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
