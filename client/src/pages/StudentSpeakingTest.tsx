import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mic, MicOff, Play, Square, Clock, Upload } from 'lucide-react';

export default function StudentSpeakingTest() {
  const { testId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudios, setRecordedAudios] = useState<Map<string, Blob>>(new Map());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: testData, isLoading } = useQuery<any>({
    queryKey: [`/api/student/speaking-tests/${testId}`],
  });

  const submitMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/student/speaking-tests/${testId}/submit`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Xatolik yuz berdi');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Javoblaringiz yuborildi',
      });
      setLocation('/student/courses');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message,
      });
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const currentQuestion = getCurrentQuestion();
        
        if (currentQuestion) {
          const newMap = new Map(recordedAudios);
          newMap.set(currentQuestion.id, audioBlob);
          setRecordedAudios(newMap);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer if question has time limit
      const currentQuestion = getCurrentQuestion();
      if (currentQuestion?.timeLimit) {
        setTimeLeft(currentQuestion.timeLimit);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev === null || prev <= 1) {
              stopRecording();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: 'Mikrofonga ruxsat berilmadi',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeLeft(null);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleNext = () => {
    const currentSection = testData.sections[currentSectionIndex];
    
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < testData.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
    }
    
    stopRecording();
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSection = testData.sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
    
    stopRecording();
  };

  const handleSubmit = () => {
    // Prepare form data
    const formData = new FormData();
    
    const answersData: any[] = [];
    const audioFiles: Blob[] = [];
    
    testData.sections.forEach((section: any) => {
      section.questions.forEach((question: any) => {
        const audio = recordedAudios.get(question.id);
        if (audio) {
          answersData.push({
            questionId: question.id,
          });
          audioFiles.push(audio);
        }
      });
    });
    
    formData.append('answers', JSON.stringify(answersData));
    audioFiles.forEach((audio, index) => {
      formData.append('audioFiles', audio, `answer_${index}.webm`);
    });
    
    submitMutation.mutate(formData);
  };

  const getCurrentQuestion = () => {
    if (!testData) return null;
    return testData.sections[currentSectionIndex]?.questions[currentQuestionIndex];
  };

  const getTotalQuestions = () => {
    if (!testData) return 0;
    return testData.sections.reduce((sum: number, section: any) => 
      sum + section.questions.length, 0
    );
  };

  const getCurrentQuestionNumber = () => {
    if (!testData) return 0;
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += testData.sections[i].questions.length;
    }
    return count + currentQuestionIndex + 1;
  };

  const getAnsweredCount = () => {
    return recordedAudios.size;
  };

  const isLastQuestion = () => {
    if (!testData) return false;
    return currentSectionIndex === testData.sections.length - 1 &&
      currentQuestionIndex === testData.sections[currentSectionIndex].questions.length - 1;
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Yuklanmoqda...</div>;
  }

  if (!testData) {
    return <div className="container mx-auto p-6">Test topilmadi</div>;
  }

  const currentQuestion = getCurrentQuestion();
  const currentSection = testData.sections[currentSectionIndex];
  const totalQuestions = getTotalQuestions();
  const currentQuestionNumber = getCurrentQuestionNumber();
  const answeredCount = getAnsweredCount();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="heading-test-title">{testData.title}</h1>
          <p className="text-sm text-muted-foreground">
            Savol {currentQuestionNumber} / {totalQuestions} - Javob berildi: {answeredCount}
          </p>
        </div>
      </div>

      <Progress value={(currentQuestionNumber / totalQuestions) * 100} className="h-2" data-testid="progress-bar" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary" data-testid="badge-section">
                Section {currentSection.sectionNumber}: {currentSection.title}
              </Badge>
              <CardTitle className="mt-2">Savol {currentQuestion.questionNumber}</CardTitle>
            </div>
            {recordedAudios.has(currentQuestion.id) && (
              <Badge variant="default" data-testid="badge-answered">
                ✓ Javob berildi
              </Badge>
            )}
          </div>
          {currentSection.description && (
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-section-description">
              {currentSection.description}
            </p>
          )}
          {currentSection.imageUrl && (
            <div className="rounded-lg overflow-hidden border mt-4">
              <img 
                src={currentSection.imageUrl} 
                alt="Section rasmi" 
                className="w-full h-auto max-h-64 object-contain"
                data-testid="img-section"
              />
            </div>
          )}
          {currentQuestion.timeLimit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4" />
              <span>Vaqt chegarasi: {currentQuestion.timeLimit} soniya</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            {currentQuestion.imageUrl && (
              <div className="rounded-lg overflow-hidden border mb-4">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="Savol rasmi" 
                  className="w-full h-auto max-h-96 object-contain"
                  data-testid="img-question"
                />
              </div>
            )}
            <p className="text-lg font-medium" data-testid="text-question">{currentQuestion.questionText}</p>
            {currentQuestion.prompt && (
              <p className="text-muted-foreground mt-2" data-testid="text-prompt">{currentQuestion.prompt}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 py-6">
            {!isRecording ? (
              <Button
                size="lg"
                className="h-24 w-24 rounded-full"
                onClick={startRecording}
                data-testid="button-start-recording"
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : (
              <>
                {timeLeft !== null && (
                  <div className="text-4xl font-bold text-primary" data-testid="text-timer">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-24 w-24 rounded-full"
                  onClick={stopRecording}
                  data-testid="button-stop-recording"
                >
                  <Square className="h-8 w-8 fill-current" />
                </Button>
              </>
            )}
            
            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Yozish davom etyapti...' : 'Javob berishni boshlash uchun bosing'}
            </p>
          </div>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
              data-testid="button-previous"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Oldingi
            </Button>
            
            {isLastQuestion() ? (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || answeredCount === 0}
                data-testid="button-submit"
              >
                <Upload className="mr-2 h-4 w-4" />
                {submitMutation.isPending ? 'Yuborilmoqda...' : 'Testni yakunlash'}
              </Button>
            ) : (
              <Button onClick={handleNext} data-testid="button-next">
                Keyingi
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Test haqida</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jami savollar:</span>
            <span className="font-medium">{totalQuestions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Javob berildi:</span>
            <span className="font-medium">{answeredCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">O'tish bali:</span>
            <span className="font-medium">{testData.passScore}/{testData.totalScore}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
