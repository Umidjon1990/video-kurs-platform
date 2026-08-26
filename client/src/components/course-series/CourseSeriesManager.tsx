import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  FolderPlus,
  Layers3,
  Trash2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ManageableCourse = {
  id: string;
  title: string;
  status: string;
  seriesId: string | null;
  seriesOrder: number;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  levelCode?: string | null;
  instructorFirstName?: string | null;
  instructorLastName?: string | null;
};

type ManagedSeries = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status: "draft" | "published";
  order: number;
  owner: { id: string; firstName?: string | null; lastName?: string | null };
};

type ManageResponse = {
  series: ManagedSeries[];
  courses: ManageableCourse[];
};

type SeriesForm = {
  title: string;
  description: string;
  coverImageUrl: string;
  status: "draft" | "published";
  order: string;
  courseIds: string[];
};

const emptyForm: SeriesForm = {
  title: "",
  description: "",
  coverImageUrl: "",
  status: "draft",
  order: "0",
  courseIds: [],
};

function directImageUrl(value?: string | null) {
  const source = (value || "").trim();
  if (!source) return "";
  const driveId = source.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || source.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
  return driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : source;
}

export function CourseSeriesManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ManagedSeries | null>(null);
  const [deletingSeries, setDeletingSeries] = useState<ManagedSeries | null>(null);
  const [form, setForm] = useState<SeriesForm>(emptyForm);

  const { data, isLoading } = useQuery<ManageResponse>({
    queryKey: ["/api/course-series/manage"],
    staleTime: 30_000,
  });
  const series = data?.series || [];
  const courses = data?.courses || [];

  const selectedCourses = useMemo(
    () => form.courseIds.map((id) => courses.find((course) => course.id === id)).filter(Boolean) as ManageableCourse[],
    [courses, form.courseIds],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        status: form.status,
        order: Number(form.order || 0),
        courseIds: form.courseIds,
      };
      const response = await apiRequest(
        editingSeries ? "PUT" : "POST",
        editingSeries ? `/api/course-series/${editingSeries.id}` : "/api/course-series",
        payload,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course-series/manage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/course-series/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/public"] });
      toast({ title: "Muvaffaqiyatli", description: editingSeries ? "To'plam yangilandi" : "Yangi to'plam yaratildi" });
      setDialogOpen(false);
      setEditingSeries(null);
      setForm(emptyForm);
    },
    onError: (error: Error) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (seriesId: string) => apiRequest("DELETE", `/api/course-series/${seriesId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course-series/manage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/course-series/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/public"] });
      toast({ title: "To'plam o'chirildi", description: "Ichidagi kurslar saqlab qolindi" });
      setDeletingSeries(null);
    },
    onError: (error: Error) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingSeries(null);
    setForm({ ...emptyForm, order: String(series.length) });
    setDialogOpen(true);
  };

  const openEdit = (item: ManagedSeries) => {
    const itemCourses = courses
      .filter((course) => course.seriesId === item.id)
      .sort((a, b) => a.seriesOrder - b.seriesOrder)
      .map((course) => course.id);
    setEditingSeries(item);
    setForm({
      title: item.title,
      description: item.description || "",
      coverImageUrl: item.coverImageUrl || "",
      status: item.status,
      order: String(item.order || 0),
      courseIds: itemCourses,
    });
    setDialogOpen(true);
  };

  const toggleCourse = (courseId: string) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const moveCourse = (courseId: string, direction: -1 | 1) => {
    setForm((current) => {
      const index = current.courseIds.indexOf(courseId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.courseIds.length) return current;
      const courseIds = [...current.courseIds];
      [courseIds[index], courseIds[nextIndex]] = [courseIds[nextIndex], courseIds[index]];
      return { ...current, courseIds };
    });
  };

  return (
    <section className="space-y-4" aria-labelledby="course-series-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="course-series-heading" className="flex items-center gap-2 text-2xl font-bold">
            <Layers3 className="h-6 w-6 text-primary" /> Kurs to'plamlari
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Silsilaviy kitoblarni bitta tartibli papkada ko'rsating.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-series">
          <FolderPlus className="mr-2 h-4 w-4" /> Yangi to'plam
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">To'plamlar yuklanmoqda...</CardContent></Card>
      ) : series.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {series.map((item) => {
            const itemCourses = courses.filter((course) => course.seriesId === item.id).sort((a, b) => a.seriesOrder - b.seriesOrder);
            const cover = directImageUrl(item.coverImageUrl || itemCourses[0]?.thumbnailUrl || itemCourses[0]?.imageUrl);
            return (
              <Card key={item.id} className="overflow-hidden" data-testid={`card-series-${item.id}`}>
                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-violet-600/30 via-background to-lime-400/10">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover opacity-75" /> : <Layers3 className="absolute bottom-4 right-5 h-16 w-16 text-primary/30" />}
                  <Badge className="absolute left-4 top-4" variant={item.status === "published" ? "default" : "secondary"}>
                    {item.status === "published" ? "Nashr qilingan" : "Qoralama"}
                  </Badge>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{itemCourses.length} ta kurs</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label={`${item.title} to'plamini tahrirlash`}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingSeries(item)} aria-label={`${item.title} to'plamini o'chirish`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {itemCourses.length ? (
                    <div className="space-y-2">
                      {itemCourses.slice(0, 4).map((course, index) => (
                        <div key={course.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                          <span className="min-w-0 flex-1 truncate">{course.title}</span>
                          {course.levelCode ? <Badge variant="outline">{course.levelCode}</Badge> : null}
                        </div>
                      ))}
                      {itemCourses.length > 4 ? <p className="text-xs text-muted-foreground">Yana {itemCourses.length - 4} ta kurs</p> : null}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Hozircha kurs biriktirilmagan.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Layers3 className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Hali kurs to'plami yo'q</p>
            <p className="mt-1 text-sm text-muted-foreground">Masalan, A0–B2 kitoblarini bitta to'plamga birlashtiring.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSeries(null); }}>
        <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col" data-testid="dialog-course-series">
          <DialogHeader>
            <DialogTitle>{editingSeries ? "To'plamni tahrirlash" : "Yangi kurs to'plami"}</DialogTitle>
            <DialogDescription>To'plam ma'lumotlarini kiriting va ichidagi kurslar tartibini belgilang.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-5 overflow-y-auto pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="series-title">To'plam nomi</Label>
                <Input id="series-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Bosqichli arab tili kitoblari" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="series-description">Qisqa tavsif</Label>
                <Textarea id="series-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="To'plam haqida qisqa ma'lumot" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="series-cover">Muqova rasmi URL</Label>
                <Input id="series-cover" value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">Bo'sh qoldirilsa, ichidagi birinchi kurs rasmi ishlatiladi.</p>
              </div>
              <div className="space-y-2">
                <Label>Holati</Label>
                <Select value={form.status} onValueChange={(value: "draft" | "published") => setForm({ ...form, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Qoralama</SelectItem>
                    <SelectItem value="published">Nashr qilish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="series-order">Katalogdagi tartibi</Label>
                <Input id="series-order" type="number" min="0" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
              </div>
            </div>

            {selectedCourses.length > 0 && (
              <div className="space-y-2">
                <Label>Tanlangan kurslar tartibi</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {selectedCourses.map((course, index) => (
                    <div key={course.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                      <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{course.title}</span>
                      {course.levelCode ? <Badge variant="outline">{course.levelCode}</Badge> : null}
                      <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveCourse(course.id, -1)} aria-label="Yuqoriga ko'chirish"><ChevronUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" disabled={index === selectedCourses.length - 1} onClick={() => moveCourse(course.id, 1)} aria-label="Pastga ko'chirish"><ChevronDown className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>To'plamga kurs qo'shish</Label>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                {courses.length ? courses.map((course) => {
                  const selected = form.courseIds.includes(course.id);
                  const assignedElsewhere = Boolean(course.seriesId && course.seriesId !== editingSeries?.id);
                  const instructor = [course.instructorFirstName, course.instructorLastName].filter(Boolean).join(" ");
                  return (
                    <label key={course.id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/60">
                      <Checkbox checked={selected} onCheckedChange={() => toggleCourse(course.id)} />
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{course.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[course.levelCode, instructor, assignedElsewhere ? "Boshqa to'plamda" : ""].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </label>
                  );
                }) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">Avval kurs yarating.</p>}
              </div>
              <p className="text-xs text-muted-foreground">Kurs boshqa to'plamda bo'lsa, tanlanganda yangi to'plamga ko'chadi.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button disabled={form.title.trim().length < 2 || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saqlanmoqda..." : editingSeries ? "Yangilash" : "To'plam yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingSeries)} onOpenChange={(open) => { if (!open) setDeletingSeries(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>To'plamni o'chirasizmi?</DialogTitle>
            <DialogDescription>“{deletingSeries?.title}” o'chiriladi, lekin uning ichidagi kurslar saqlanib qoladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSeries(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deletingSeries && deleteMutation.mutate(deletingSeries.id)}>
              {deleteMutation.isPending ? "O'chirilmoqda..." : "To'plamni o'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
