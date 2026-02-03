import { useEffect, useState, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DailyIframe from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  PhoneOff, 
  Users, 
  MessageCircle,
  Circle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LiveRoomData {
  id: string;
  dailyRoomName: string;
  dailyRoomUrl: string;
  title: string;
  description: string | null;
  status: string;
  courseId: string | null;
  instructorId: string;
  maxParticipants: number;
  startedAt: string;
  instructor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export default function LiveRoom() {
  const [, params] = useRoute('/live/:roomId');
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;
  const queryClient = useQueryClient();
  
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });
  
  const { data: room, isLoading: roomLoading, error: roomError } = useQuery<LiveRoomData>({
    queryKey: ['/api/live-rooms', roomId],
    enabled: !!roomId,
  });
  
  const endRoomMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/instructor/live-rooms/${roomId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-rooms'] });
      setLocation('/instructor');
    },
  });
  
  const isInstructor = user?.role === 'instructor' && room?.instructorId === user?.id;
  
  useEffect(() => {
    if (!room || callFrame) return;
    
    const container = document.getElementById('daily-container');
    if (!container) return;
    
    const frame = DailyIframe.createFrame(container, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '12px',
      },
      showLeaveButton: false,
      showFullscreenButton: true,
    });
    
    frame.on('joined-meeting', () => {
      setIsJoined(true);
    });
    
    frame.on('left-meeting', () => {
      setIsJoined(false);
      setLocation(isInstructor ? '/instructor' : '/student');
    });
    
    frame.on('participant-joined', () => {
      const counts = frame.participantCounts();
      setParticipantCount(counts.present || 0);
    });
    
    frame.on('participant-left', () => {
      const counts = frame.participantCounts();
      setParticipantCount(counts.present || 0);
    });
    
    frame.on('camera-error', () => {
      setIsCameraOn(false);
    });
    
    setCallFrame(frame);
    
    frame.join({ url: room.dailyRoomUrl });
    
    return () => {
      if (frame) {
        frame.destroy();
      }
    };
  }, [room]);
  
  const toggleCamera = useCallback(() => {
    if (callFrame) {
      callFrame.setLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  }, [callFrame, isCameraOn]);
  
  const toggleMic = useCallback(() => {
    if (callFrame) {
      callFrame.setLocalAudio(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  }, [callFrame, isMicOn]);
  
  const toggleScreenShare = useCallback(async () => {
    if (callFrame) {
      if (isScreenSharing) {
        await callFrame.stopScreenShare();
      } else {
        await callFrame.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    }
  }, [callFrame, isScreenSharing]);
  
  const startLocalRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as any,
        audio: true,
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `live-class-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecordedChunks([]);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);
  
  const stopLocalRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
    }
  }, [mediaRecorder]);
  
  const leaveRoom = useCallback(() => {
    if (callFrame) {
      callFrame.leave();
    }
  }, [callFrame]);
  
  const endRoom = useCallback(() => {
    if (callFrame) {
      callFrame.leave();
    }
    endRoomMutation.mutate();
  }, [callFrame, endRoomMutation]);
  
  if (roomLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  if (roomError || !room) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Jonli dars topilmadi yoki tugagan</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation(isInstructor ? '/instructor' : '/student')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Orqaga qaytish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (room.status === 'ended') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Bu jonli dars tugagan</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation(isInstructor ? '/instructor' : '/student')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Orqaga qaytish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation(isInstructor ? '/instructor' : '/student')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">{room.title}</h1>
            {room.instructor && (
              <p className="text-sm text-muted-foreground">
                O'qituvchi: {room.instructor.firstName} {room.instructor.lastName}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {participantCount}
          </Badge>
          {isRecording && (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Circle className="w-2 h-2 fill-current" />
              Yozilmoqda
            </Badge>
          )}
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Jonli
          </Badge>
        </div>
      </header>
      
      <main className="flex-1 p-4">
        <div 
          id="daily-container" 
          className="w-full h-full bg-black rounded-xl overflow-hidden"
          style={{ minHeight: '400px' }}
        />
      </main>
      
      <footer className="border-t px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={isCameraOn ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleCamera}
            data-testid="button-toggle-camera"
          >
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={isMicOn ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleMic}
            data-testid="button-toggle-mic"
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          
          {isInstructor && (
            <>
              <Button
                variant={isScreenSharing ? 'secondary' : 'outline'}
                size="icon"
                onClick={toggleScreenShare}
                data-testid="button-toggle-screenshare"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                onClick={isRecording ? stopLocalRecording : startLocalRecording}
                className="gap-2"
                data-testid="button-toggle-recording"
              >
                <Circle className={`w-3 h-3 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                {isRecording ? 'To\'xtatish' : 'Yozish'}
              </Button>
            </>
          )}
          
          <div className="w-px h-8 bg-border mx-2" />
          
          {isInstructor ? (
            <Button
              variant="destructive"
              onClick={endRoom}
              disabled={endRoomMutation.isPending}
              className="gap-2"
              data-testid="button-end-room"
            >
              <PhoneOff className="w-4 h-4" />
              Darsni tugatish
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={leaveRoom}
              className="gap-2"
              data-testid="button-leave-room"
            >
              <PhoneOff className="w-4 h-4" />
              Chiqish
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
