import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Edit, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertSpeakingTestSectionSchema, insertSpeakingQuestionSchema } from '@shared/schema';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const sectionFormSchema = insertSpeakingTestSectionSchema.omit({ speakingTestId: true }).extend({
  preparationTime: z.string().transform(val => val ? Number(val) : 30),
  speakingTime: z.string().transform(val => val ? Number(val) : 60),
});
const questionFormSchema = insertSpeakingQuestionSchema.omit({ sectionId: true }).extend({
  questionNumber: z.string().transform(Number),
  preparationTime: z.string().optional().transform(val => val ? Number(val) : null),
  speakingTime: z.string().optional().transform(val => val ? Number(val) : null),
});

export default function SpeakingTestEdit() {
  const { testId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const { data: testData, isLoading } = useQuery<any>({
    queryKey: [`/api/instructor/speaking-tests/${testId}`],
  });

  const updateTestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/instructor/speaking-tests/${testId}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      toast({ title: 'Test yangilandi' });
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/instructor/speaking-tests/${testId}/sections`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      setIsSectionDialogOpen(false);
      toast({ title: 'Section qo\'shildi' });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return await apiRequest(`/api/instructor/sections/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      setIsSectionDialogOpen(false);
      toast({ title: 'Section yangilandi' });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      return await apiRequest(`/api/instructor/sections/${sectionId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      toast({ title: 'Section o\'chirildi' });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async ({ sectionId, data }: any) => {
      return await apiRequest(`/api/instructor/sections/${sectionId}/questions`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      setIsQuestionDialogOpen(false);
      setSelectedSection(null);
      toast({ title: 'Savol qo\'shildi' });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return await apiRequest(`/api/instructor/questions/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      setIsQuestionDialogOpen(false);
      setSelectedQuestion(null);
      toast({ title: 'Savol yangilandi' });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      return await apiRequest(`/api/instructor/questions/${questionId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/speaking-tests/${testId}`] });
      toast({ title: 'Savol o\'chirildi' });
    },
  });

  if (isLoading) {
    return <div className="container mx-auto p-6">Yuklanmoqda...</div>;
  }

  if (!testData) {
    return <div className="container mx-auto p-6">Test topilmadi</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold" data-testid="heading-test-title">{testData.title}</h1>
          <p className="text-muted-foreground">{testData.description}</p>
        </div>
        <div className="flex gap-2">
          {testData.isPublished && <Badge>Nashr</Badge>}
          {testData.isDemo && <Badge variant="secondary">Demo</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Sozlamalari</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Davomiyligi</Label>
            <p className="text-2xl font-bold">{testData.duration} daq</p>
          </div>
          <div>
            <Label>O'tish bali</Label>
            <p className="text-2xl font-bold">{testData.passScore}</p>
          </div>
          <div>
            <Label>Maksimal ball</Label>
            <p className="text-2xl font-bold">{testData.totalScore}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={testData.isPublished}
              onCheckedChange={(checked) => updateTestMutation.mutate({ isPublished: checked })}
              data-testid="switch-published"
            />
            <Label>Nashr qilish</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Sections va Savollar</h2>
        <Button onClick={() => setIsSectionDialogOpen(true)} data-testid="button-add-section">
          <Plus className="mr-2 h-4 w-4" />
          Section qo'shish
        </Button>
      </div>

      {!testData.sections || testData.sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Hali section qo'shilmagan</p>
            <Button onClick={() => setIsSectionDialogOpen(true)} data-testid="button-add-first-section">
              <Plus className="mr-2 h-4 w-4" />
              Birinchi sectionni qo'shish
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {testData.sections.map((section: any) => (
            <Card key={section.id} data-testid={`card-section-${section.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      Section {section.sectionNumber}: {section.title}
                    </CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                    {section.timeLimit && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Vaqt chegarasi: {section.timeLimit} soniya
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedSection(section);
                        setIsQuestionDialogOpen(true);
                      }}
                      data-testid={`button-add-question-${section.id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                      data-testid={`button-delete-section-${section.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {section.questions && section.questions.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {section.questions.map((question: any) => (
                      <div
                        key={question.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover-elevate"
                        data-testid={`question-${question.id}`}
                      >
                        <Badge variant="outline">{question.questionNumber}</Badge>
                        <div className="flex-1">
                          <p className="font-medium">{question.questionText}</p>
                          {question.prompt && (
                            <p className="text-sm text-muted-foreground mt-1">{question.prompt}</p>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            {question.timeLimit && <span>Vaqt: {question.timeLimit}s</span>}
                            {question.expectedDuration && <span>Kutilgan: {question.expectedDuration}s</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setIsQuestionDialogOpen(true);
                            }}
                            data-testid={`button-edit-question-${question.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionMutation.mutate(question.id)}
                            data-testid={`button-delete-question-${question.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <SectionDialog
        open={isSectionDialogOpen}
        onOpenChange={setIsSectionDialogOpen}
        onSubmit={(data) => createSectionMutation.mutate(data)}
        isPending={createSectionMutation.isPending}
      />

      <QuestionDialog
        open={isQuestionDialogOpen}
        onOpenChange={(open) => {
          setIsQuestionDialogOpen(open);
          if (!open) {
            setSelectedSection(null);
            setSelectedQuestion(null);
          }
        }}
        question={selectedQuestion}
        onSubmit={(data) => {
          if (selectedQuestion) {
            updateQuestionMutation.mutate({ id: selectedQuestion.id, data });
          } else if (selectedSection) {
            createQuestionMutation.mutate({ sectionId: selectedSection.id, data });
          }
        }}
        isPending={createQuestionMutation.isPending || updateQuestionMutation.isPending}
      />
    </div>
  );
}

function SectionDialog({ open, onOpenChange, onSubmit, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (data: any) => void; isPending: boolean }) {
  const form = useForm({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      sectionNumber: 1,
      title: '',
      instructions: '',
      preparationTime: '30',
      speakingTime: '60',
      imageUrl: '',
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-section">
        <DialogHeader>
          <DialogTitle>Section qo'shish</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sectionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section raqami</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" data-testid="input-section-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section nomi</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Part 1: Introduction" data-testid="input-section-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ko'rsatmalar (ixtiyoriy)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="input-section-instructions" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preparationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tayyorgarlik vaqti (soniya)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" data-testid="input-section-prep-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="speakingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gapirish vaqti (soniya)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" data-testid="input-section-speaking-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rasm URL (ixtiyoriy)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-section-image" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-section">
                {isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDialog({ open, onOpenChange, question, onSubmit, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; question: any; onSubmit: (data: any) => void; isPending: boolean }) {
  const form = useForm({
    resolver: zodResolver(questionFormSchema),
    defaultValues: question ? {
      questionNumber: question.questionNumber.toString(),
      questionText: question.questionText,
      preparationTime: question.preparationTime?.toString() || '',
      speakingTime: question.speakingTime?.toString() || '',
      imageUrl: question.imageUrl || '',
    } : {
      questionNumber: '1',
      questionText: '',
      preparationTime: '',
      speakingTime: '',
      imageUrl: '',
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-question">
        <DialogHeader>
          <DialogTitle>{question ? 'Savolni tahrirlash' : 'Savol qo\'shish'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="questionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Savol raqami</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" data-testid="input-question-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Savol matni</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="input-question-text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preparationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tayyorgarlik vaqti (soniya, ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" data-testid="input-question-prep-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="speakingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gapirish vaqti (soniya, ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" data-testid="input-question-speaking-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rasm URL (ixtiyoriy)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-question-image" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-question">
                {isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
