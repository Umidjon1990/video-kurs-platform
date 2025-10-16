import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardCheck, Home } from "lucide-react";

export default function StudentResults() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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
    </div>
  );
}
