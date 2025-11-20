import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Mic, Clock, Award, Trash2, Edit, Eye, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertSpeakingTestSchema } from '@shared/schema';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = insertSpeakingTestSchema.extend({
  duration: z.string().transform(Number),
  passScore: z.string().transform(Number),
  totalScore: z.string().transform(Number),
});

export default function SpeakingTests() {
  const { courseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  const { data: tests, isLoading } = useQuery<any[]>({
    queryKey: [`/api/instructor/courses/${courseId}/speaking-tests`],
  });

  const { data: course } = useQuery<any>({
    queryKey: [`/api/instructor/courses/${courseId}`],
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: courseId || '',
      title: '',
      description: '',
      duration: '60',
      passScore: '60',
      totalScore: '100',
      instructions: '',
      isPublished: false,
      isDemo: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/instructor/speaking-tests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/courses/${courseId}/speaking-tests`] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Speaking test yaratildi',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      return await apiRequest(`/api/instructor/speaking-tests/${testId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/courses/${courseId}/speaking-tests`] });
      setTestToDelete(null);
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Speaking test o\'chirildi',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-speaking-tests">Speaking Testlar</h1>
          {course && (
            <p className="text-muted-foreground mt-1">{course.title}</p>
          )}
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-test">
          <Plus className="mr-2 h-4 w-4" />
          Yangi Test
        </Button>
      </div>

      {!tests || tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mic className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Speaking test yo'q</h3>
            <p className="text-muted-foreground text-center mb-4">
              Talabalaringiz uchun speaking test yarating
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-test">
              <Plus className="mr-2 h-4 w-4" />
              Birinchi testni yaratish
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test: any) => (
            <Card key={test.id} className="hover-elevate" data-testid={`card-test-${test.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl">{test.title}</CardTitle>
                  <div className="flex gap-2">
                    {test.isPublished && (
                      <Badge variant="default" data-testid={`badge-published-${test.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        Nashr
                      </Badge>
                    )}
                    {test.isDemo && (
                      <Badge variant="secondary" data-testid={`badge-demo-${test.id}`}>
                        Demo
                      </Badge>
                    )}
                  </div>
                </div>
                {test.description && (
                  <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{test.duration} daqiqa</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>O'tish bali: {test.passScore}/{test.totalScore}</span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setLocation(`/instructor/speaking-tests/${test.id}`)}
                  data-testid={`button-edit-${test.id}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Tahrirlash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestToDelete(test.id)}
                  data-testid={`button-delete-${test.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-test">
          <DialogHeader>
            <DialogTitle>Yangi Speaking Test</DialogTitle>
            <DialogDescription>
              Talabalar uchun yangi speaking test yarating
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Nomi</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="IELTS Speaking Test" data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tavsif</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Test haqida qisqacha ma'lumot" rows={3} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Davomiyligi (daqiqa)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" data-testid="input-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O'tish bali</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" data-testid="input-pass-score" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maksimal ball</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" data-testid="input-total-score" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ko'rsatmalar</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Talabalar uchun ko'rsatmalar" rows={4} data-testid="input-instructions" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-published" />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Nashr qilish</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDemo"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-demo" />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Demo test</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? 'Yuklanmoqda...' : 'Yaratish'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testToDelete} onOpenChange={() => setTestToDelete(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Testni o'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham bu testni o'chirmoqchimisiz? Bu amalni bekor qilish mumkin emas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestToDelete(null)} data-testid="button-cancel-delete">
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => testToDelete && deleteMutation.mutate(testToDelete)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'O\'chirilmoqda...' : 'O\'chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
