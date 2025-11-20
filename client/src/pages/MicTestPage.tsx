import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Volume2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MicTestPage() {
  const [, setLocation] = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startMicTest = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      
      // Setup audio context and analyser for volume detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Animate audio level
      const updateLevel = () => {
        if (analyser) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(Math.min(100, (average / 255) * 100 * 2));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
      
    } catch (err) {
      setError('Mikrofonga ruxsat berilmadi yoki mikrofonni ishlatib bo\'lmadi.');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const handleStartTest = () => {
    stopRecording();
    setLocation('/student/speaking-test/6e9b5dfb-62bb-4dbf-82fd-55d7d9482c14');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" data-testid="title-mic-test">Mikrofon testi</h1>
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            Bekor qilish
          </Button>
        </div>

        <Card data-testid="card-mic-test">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Mikrofon sozlamasini tekshiring
            </CardTitle>
            <CardDescription>
              Test boshlasdan avval mikrofoningiz to'g'ri ishlayotganini tekshiring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Quydagi matni o'qing va ovozingizni tinglang. Agar yaxshi eshitilsa, testni boshlashim mumkin.
              </AlertDescription>
            </Alert>

            {/* Sample Text */}
            <div className="bg-muted p-6 rounded-lg space-y-4" data-testid="sample-text">
              <p className="text-lg leading-relaxed">
                Assalomu alaykum! Mening ismim Talaba. Men Imtihonchi platformasida CEFR og'zaki baholash testini topshiryapman. 
                Mikrofonim to'g'ri sozlanganini tekshiryapman. Agar ovoz yaxshi eshitilsa, testni boshlashim mumkin.
              </p>
            </div>

            {/* Mic Test Controls */}
            <div className="space-y-4">
              {!isRecording && !permissionGranted && (
                <Button 
                  onClick={startMicTest} 
                  className="w-full" 
                  size="lg"
                  data-testid="button-test-mic"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Tayyorgarlik vaqti tugagach, avtomatik yozuv boshlanadi
                </Button>
              )}

              {isRecording && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
                    <Volume2 className="h-8 w-8 text-primary animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Ovoz darajasi</p>
                      <Progress value={audioLevel} className="h-3" data-testid="progress-audio-level" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Yuqoridagi matnni o'qing va ovozingizni tekshiring
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Start Test Button */}
            {permissionGranted && (
              <Button
                onClick={handleStartTest}
                size="lg"
                className="w-full"
                data-testid="button-start-test"
              >
                Yozishni boshlash
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
