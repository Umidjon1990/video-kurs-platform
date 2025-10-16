import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";
import { FileText, ClipboardCheck, Home, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StudentResults() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const { data: submissions } = useQuery<any[]>({
    queryKey: ["/api/student/submissions"],
    enabled: isAuthenticated,
  });

  const { data: testAttempts } = useQuery<any[]>({
    queryKey: ["/api/student/test-attempts"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <Home className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-results-title">Mening Natijalarim</h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
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
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList>
            <TabsTrigger value="assignments" data-testid="tab-assignment-results">
              <FileText className="w-4 h-4 mr-2" />
              Vazifalar
            </TabsTrigger>
            <TabsTrigger value="tests" data-testid="tab-test-results">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Testlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4 mt-6">
            {!submissions || submissions.length === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <p className="text-center text-muted-foreground">
                    Hali vazifalar topshirmadingiz
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {submissions.map((item: any) => (
                  <Card key={item.id} data-testid={`submission-result-${item.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.assignment?.title || 'Vazifa'}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Kurs: {item.assignment?.course?.title}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${
                          item.status === 'graded' ? 'bg-green-100 text-green-800' :
                          item.status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status === 'graded' ? 'Tekshirilgan' :
                           item.status === 'needs_revision' ? 'Qayta topshiring' :
                           'Kutilmoqda'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Javobingiz:</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {item.content || "Matn kiritilmagan"}
                        </p>
                      </div>
                      
                      {item.score !== null && (
                        <div>
                          <p className="text-sm font-medium">Ball: <span className="text-lg">{item.score}</span></p>
                        </div>
                      )}
                      
                      {item.feedback && (
                        <div>
                          <p className="text-sm font-medium mb-1">O'qituvchi izohi:</p>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                            {item.feedback}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSubmission(item)}
                          data-testid={`button-view-details-${item.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Batafsil ko'rish
                        </Button>
                        {item.status === 'needs_revision' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/learn/${item.assignment?.courseId}`)}
                            data-testid={`button-resubmit-${item.id}`}
                          >
                            Qayta topshirish
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests" className="space-y-4 mt-6">
            {!testAttempts || testAttempts.length === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <p className="text-center text-muted-foreground">
                    Hali testlar topshirmadingiz
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {testAttempts.map((attempt: any) => (
                  <Card key={attempt.id} data-testid={`test-result-${attempt.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{attempt.test?.title || 'Test'}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Sana: {new Date(attempt.completedAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${
                          attempt.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {attempt.isPassed ? "O'tdi" : "O'tmadi"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Sizning ballingiz:</p>
                        <p className="text-xl font-bold">{attempt.score} / {attempt.totalPoints}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Foiz:</p>
                        <p className="text-lg font-semibold">
                          {Math.round((attempt.score / attempt.totalPoints) * 100)}%
                        </p>
                      </div>
                      {attempt.test?.passingScore && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">O'tish bali:</p>
                          <p className="text-sm font-medium">{attempt.test.passingScore}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Batafsil ko'rish Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-submission-details">
          <DialogHeader>
            <DialogTitle>Vazifa Natijasi</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{selectedSubmission.assignment?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Kurs: {selectedSubmission.assignment?.course?.title}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="font-medium">Holat:</span>
                  <Badge 
                    className="ml-2"
                    variant={
                      selectedSubmission.status === 'graded' ? 'default' :
                      selectedSubmission.status === 'needs_revision' ? 'secondary' :
                      'outline'
                    }
                  >
                    {selectedSubmission.status === 'graded' ? '✅ Tekshirilgan' :
                     selectedSubmission.status === 'needs_revision' ? '⚠️ Qayta topshiring' :
                     '⏳ Kutilmoqda'}
                  </Badge>
                </div>
              </div>

              {selectedSubmission.score !== null && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Sizning ballingiz</p>
                  <p className="text-4xl font-bold text-primary">{selectedSubmission.score}</p>
                  <p className="text-sm text-muted-foreground mt-1">100 balldan</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Sizning javobingiz:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{selectedSubmission.content || "Matn kiritilmagan"}</p>
                </div>
              </div>

              {selectedSubmission.imageUrls && selectedSubmission.imageUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Yuklangan rasmlar:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSubmission.imageUrls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Image ${i + 1}`} className="rounded border w-full h-32 object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {selectedSubmission.audioUrls && selectedSubmission.audioUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Audio fayllar:</h4>
                  {selectedSubmission.audioUrls.map((url: string, i: number) => (
                    <audio key={i} controls className="w-full mb-2">
                      <source src={url} />
                    </audio>
                  ))}
                </div>
              )}

              {selectedSubmission.fileUrls && selectedSubmission.fileUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Fayllar:</h4>
                  {selectedSubmission.fileUrls.map((url: string, i: number) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline mb-1"
                    >
                      📎 Fayl {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {selectedSubmission.feedback && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">O'qituvchi izohi:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">{selectedSubmission.feedback}</p>
                  </div>
                </div>
              )}

              {selectedSubmission.submittedAt && (
                <div className="text-sm text-muted-foreground">
                  Topshirilgan vaqt: {new Date(selectedSubmission.submittedAt).toLocaleString('uz-UZ')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
