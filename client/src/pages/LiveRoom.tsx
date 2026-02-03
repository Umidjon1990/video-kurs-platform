import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Circle,
  ArrowLeft,
  Loader2,
  Download
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LiveRoomData {
  id: string;
  jitsiRoomName: string;
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

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function LiveRoom() {
  const [, params] = useRoute('/live/:roomId');
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;
  const queryClient = useQueryClient();
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [participantCount, setParticipantCount] = useState(1);
  
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
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!room || !jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;
    if (jitsiApiRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: room.jitsiRoomName || `zamonaviy-edu-${room.id}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Mehmon' : 'Mehmon',
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableInviteFunctions: true,
        enableClosePage: false,
        toolbarButtons: [
          'camera',
          'chat',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'hangup',
          'microphone',
          'participants-pane',
          'raisehand',
          'settings',
          'tileview',
          'toggle-camera',
          'videoquality',
        ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        TOOLBAR_BUTTONS: [
          'camera',
          'chat',
          'desktop',
          'fullscreen',
          'hangup',
          'microphone',
          'participants-pane',
          'raisehand',
          'settings',
          'tileview',
        ],
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = api;

    api.addListener('videoConferenceJoined', () => {
      setIsJoined(true);
    });

    api.addListener('videoConferenceLeft', () => {
      setIsJoined(false);
      setLocation(isInstructor ? '/instructor' : '/courses');
    });

    api.addListener('participantJoined', () => {
      const count = api.getNumberOfParticipants();
      setParticipantCount(count);
    });

    api.addListener('participantLeft', () => {
      const count = api.getNumberOfParticipants();
      setParticipantCount(count);
    });

    api.addListener('audioMuteStatusChanged', (status: { muted: boolean }) => {
      setIsMicOn(!status.muted);
    });

    api.addListener('videoMuteStatusChanged', (status: { muted: boolean }) => {
      setIsCameraOn(!status.muted);
    });

    api.addListener('screenSharingStatusChanged', (status: { on: boolean }) => {
      setIsScreenSharing(status.on);
    });

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [room, user, isInstructor]);
  
  const toggleCamera = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  }, []);
  
  const toggleMic = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);
  
  const toggleScreenShare = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleShareScreen');
    }
  }, []);
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
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
        setRecordedChunks(chunks);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  }, []);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder]);
  
  const downloadRecording = useCallback(() => {
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jonli-dars-${room?.title || roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [recordedChunks, room, roomId]);
  
  const leaveRoom = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('hangup');
    }
    setLocation(isInstructor ? '/instructor' : '/courses');
  }, [isInstructor, setLocation]);
  
  const handleEndRoom = useCallback(() => {
    if (confirm("Jonli darsni tugatmoqchimisiz? Barcha ishtirokchilar chiqariladi.")) {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('hangup');
      }
      endRoomMutation.mutate();
    }
  }, [endRoomMutation]);

  if (roomLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Xatolik</CardTitle>
            <CardDescription>
              Bu jonli darsga kirishga ruxsatingiz yo'q yoki dars topilmadi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} variant="outline">
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
      <div className="h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Jonli dars tugadi</CardTitle>
            <CardDescription>
              Bu jonli dars allaqachon tugatilgan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation(isInstructor ? '/instructor' : '/courses')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Orqaga qaytish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={leaveRoom} data-testid="button-leave-room">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold flex items-center gap-2">
              {room.title}
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="w-2 h-2 mr-1 fill-current" />
                JONLI
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {room.instructor?.firstName} {room.instructor?.lastName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participantCount}
          </Badge>
          
          {isInstructor && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleEndRoom}
              disabled={endRoomMutation.isPending}
              data-testid="button-end-room"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Darsni Tugatish
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <div 
          ref={jitsiContainerRef}
          id="jitsi-container" 
          className="w-full h-full rounded-xl overflow-hidden bg-black"
          data-testid="jitsi-video-container"
        />
      </div>
      
      <div className="p-4 border-t bg-card">
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant={isCameraOn ? "secondary" : "destructive"}
            size="icon"
            onClick={toggleCamera}
            data-testid="button-toggle-camera"
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          
          <Button 
            variant={isMicOn ? "secondary" : "destructive"}
            size="icon"
            onClick={toggleMic}
            data-testid="button-toggle-mic"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Button 
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon"
            onClick={toggleScreenShare}
            data-testid="button-toggle-screen"
          >
            <Monitor className="w-5 h-5" />
          </Button>
          
          {isInstructor && (
            <>
              {!isRecording ? (
                <Button 
                  variant="secondary"
                  onClick={startRecording}
                  data-testid="button-start-recording"
                >
                  <Circle className="w-4 h-4 mr-2 text-red-500" />
                  Yozib olish
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={stopRecording}
                  data-testid="button-stop-recording"
                >
                  <Circle className="w-4 h-4 mr-2 fill-current animate-pulse" />
                  To'xtatish
                </Button>
              )}
              
              {recordedChunks.length > 0 && !isRecording && (
                <Button 
                  variant="outline"
                  onClick={downloadRecording}
                  data-testid="button-download-recording"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Yuklab olish
                </Button>
              )}
            </>
          )}
          
          <Button 
            variant="destructive"
            onClick={leaveRoom}
            data-testid="button-leave"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Chiqish
          </Button>
        </div>
      </div>
    </div>
  );
}
