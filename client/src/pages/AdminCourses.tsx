import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Users, Video } from "lucide-react";
import { useLocation } from "wouter";

type Course = {
  id: string;
  title: string;
  status: string;
  instructorId: string;
  enrollmentsCount?: number;
  lessonsCount?: number;
  instructor?: {
    firstName: string;
    lastName: string;
  };
};

export default function AdminCourses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: isAuthenticated,
  });

  // Filter courses by search query
  const filteredCourses = courses?.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor?.firstName + " " + course.instructor?.lastName)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">
              Barcha Kurslar
            </h1>
            <p className="text-muted-foreground mt-1">
              Platformadagi barcha kurslarni ko'ring va boshqaring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <BookOpen className="w-4 h-4 mr-2" />
              {courses?.length || 0} ta kurs
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Kurs yoki o'qituvchi nomi bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-courses"
          />
        </div>
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kurslar Ro'yxati</CardTitle>
          <CardDescription>
            Barcha o'qituvchilar tomonidan yaratilgan kurslar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCourses && filteredCourses.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurs Nomi</TableHead>
                    <TableHead>O'qituvchi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">O'quvchilar</TableHead>
                    <TableHead className="text-center">Darslar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id} data-testid={`course-row-${course.id}`}>
                      <TableCell className="font-medium">
                        {course.title}
                      </TableCell>
                      <TableCell>
                        {course.instructor && (course.instructor.firstName || course.instructor.lastName) ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {(course.instructor.firstName?.[0] || "") +
                                  (course.instructor.lastName?.[0] || "")}
                              </span>
                            </div>
                            <span>
                              {course.instructor.firstName || ""}{" "}
                              {course.instructor.lastName || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            course.status === "published"
                              ? "default"
                              : "secondary"
                          }
                          data-testid={`badge-status-${course.id}`}
                        >
                          {course.status === "published"
                            ? "Nashr qilingan"
                            : "Qoralama"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{course.enrollmentsCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Video className="w-4 h-4 text-muted-foreground" />
                          <span>{course.lessonsCount || 0}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Qidiruv bo'yicha kurslar topilmadi"
                  : "Hali kurslar mavjud emas"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
