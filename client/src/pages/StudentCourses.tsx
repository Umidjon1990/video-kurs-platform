import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCard } from "@/components/CourseCard";
import { useLocation } from "wouter";
import type { Course } from "@shared/schema";

export default function StudentCourses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const enrolledCourseIds = new Set(enrolledCourses?.map(c => c.id) || []);

  const handleEnroll = (courseId: string) => {
    setLocation(`/checkout/${courseId}`);
  };

  const handleViewCourse = (courseId: string) => {
    setLocation(`/learn/${courseId}`);
  };

  const handleViewDemo = (courseId: string) => {
    setLocation(`/learn/${courseId}`);
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
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => setLocation("/results")}
              data-testid="button-results"
            >
              Natijalarim
            </Button>
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
    </div>
  );
}
