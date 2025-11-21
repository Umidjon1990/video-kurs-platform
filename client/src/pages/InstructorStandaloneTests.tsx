import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ShoppingCart, DollarSign, Clock, Award, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const standaloneTestSchema = z.object({
  title: z.string().min(1, 'Test nomi kerak'),
  description: z.string().optional(),
  price: z.number().min(0, 'Narx kerak'),
  duration: z.number().min(1, 'Vaqt kerak'),
  totalScore: z.number().min(1, 'Ball kerak'),
  thumbnailUrl: z.string().optional(),
  testType: z.enum(['standard', 'speaking']),
});

type StandaloneTestForm = z.infer<typeof standaloneTestSchema>;

interface StandaloneTest extends StandaloneTestForm {
  id: string;
}

export default function InstructorStandaloneTests() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<StandaloneTest | null>(null);

  const { data: tests = [], isLoading } = useQuery<StandaloneTest[]>({
    queryKey: ['/api/instructor/standalone-tests'],
  });

  const form = useForm<StandaloneTestForm>({
    resolver: zodResolver(standaloneTestSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 50000,
      duration: 60,
      totalScore: 100,
      thumbnailUrl: '',
      testType: 'standard',
    } as any,
  });

  const createMutation = useMutation({
    mutationFn: async (data: StandaloneTestForm) => {
      const endpoint = data.testType === 'standard'
        ? '/api/instructor/tests'
        : '/api/instructor/speaking-tests';
      return await apiRequest(endpoint, 'POST', {
        ...data,
        courseId: null,
        isPublished: false,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Standalone test yaratildi',
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/standalone-tests'] });
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
      return await apiRequest(`/api/instructor/tests/${testId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Test o\'chirildi',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/standalone-tests'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: StandaloneTestForm) => {
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
          <h1 className="text-3xl font-bold" data-testid="heading-standalone-tests">Standalone Testlar</h1>
          <p className="text-muted-foreground mt-2">Kursdan mustaqil o'zini tekshirish testlarini yarating</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-standalone">
          <Plus className="mr-2 h-4 w-4" />
          Yangi Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Standalone test yo'q</h3>
            <p className="text-muted-foreground text-center mb-4">
              Talabalaringiz sotib ola oladigan test yarating
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
              <Plus className="mr-2 h-4 w-4" />
              Birinchi testni yaratish
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card key={test.id} className="hover-elevate flex flex-col" data-testid={`card-test-${test.id}`}>
              {test.thumbnailUrl && (
                <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
                  <img
                    src={test.thumbnailUrl}
                    alt={test.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="flex-1">
                <CardTitle className="text-lg">{test.title}</CardTitle>
                {test.description && (
                  <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{test.price.toLocaleString()} so'm</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{test.duration} min</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{test.totalScore} ball</span>
                </div>
              </CardContent>
              <CardFooter className="gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  data-testid={`button-edit-${test.id}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Tahrirlash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(test.id)}
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
        <DialogContent className="max-w-2xl" data-testid="dialog-create-standalone">
          <DialogHeader>
            <DialogTitle>Yangi Standalone Test</DialogTitle>
            <DialogDescription>
              Talabalar sotib ola oladigan test yarating
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
                      <Input {...field} placeholder="TOEFL Practice Test" data-testid="input-title" />
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
                    <FormLabel>Tavsifi</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Test haqida ma'lumot" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Turi</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-test-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standart</SelectItem>
                        <SelectItem value="speaking">Speaking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Narx (so'm)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="50000" onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vaqt (min)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="120" onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-duration" />
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
                      <FormLabel>Jami Ball</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="100" onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-score" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-thumbnail" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yuklanmoqda...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Test Yaratish
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
