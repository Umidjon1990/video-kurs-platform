import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, PhoneOff, Users, Volume2, Loader2 } from "lucide-react";

interface CourseVoiceChatProps {
  courseId: string;
  courseTitle: string;
  currentUserId: string;
  userName: string;
}

export function CourseVoiceChat({ courseId, courseTitle, currentUserId, userName }: CourseVoiceChatProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  
  const roomName = `zamonaviy-edu-voice-${courseId.replace(/-/g, '')}`;
  
  const loadJitsiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      
      const existingScript = document.querySelector('script[src*="external_api.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi API'));
      document.head.appendChild(script);
    });
  };
  
  const joinVoiceChat = async () => {
    setIsLoading(true);
    
    try {
      await loadJitsiScript();
      
      if (!jitsiContainerRef.current || !(window as any).JitsiMeetExternalAPI) {
        throw new Error('Jitsi container or API not available');
      }
      
      const api = new (window as any).JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: 300,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          disableModeratorIndicator: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: true,
          toolbarButtons: [
            'microphone',
            'hangup',
            'participants-pane',
            'settings',
          ],
          notifications: [],
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          disableProfile: true,
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_BACKGROUND: '#1e1e2e',
          TOOLBAR_ALWAYS_VISIBLE: true,
          FILM_STRIP_MAX_HEIGHT: 0,
          DISABLE_VIDEO_BACKGROUND: true,
          DISABLE_FOCUS_INDICATOR: true,
          VIDEO_QUALITY_LABEL_DISABLED: true,
          CONNECTION_INDICATOR_DISABLED: true,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        },
        userInfo: {
          displayName: userName,
        },
      });
      
      jitsiApiRef.current = api;
      
      api.addListener('readyToClose', () => {
        leaveVoiceChat();
      });
      
      api.addListener('audioMuteStatusChanged', (event: any) => {
        setIsMuted(event.muted);
      });
      
      setIsJoined(true);
    } catch (error) {
      console.error('Error joining voice chat:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const leaveVoiceChat = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setIsJoined(false);
    setIsMuted(false);
  };
  
  const toggleMute = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  };
  
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Ovozli Suhbat</CardTitle>
          </div>
          {isJoined && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
              Ulanildi
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Kurs bo'yicha guruh a'zolari bilan ovozli suhbatlashing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isJoined ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic className="h-10 w-10 text-primary" />
            </div>
            <p className="text-center text-muted-foreground max-w-xs">
              Guruh a'zolari bilan real vaqtda ovozli aloqa o'rnatish uchun qo'shiling
            </p>
            <Button 
              onClick={joinVoiceChat} 
              disabled={isLoading}
              size="lg"
              className="min-w-[200px]"
              data-testid="button-join-voice-chat"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ulanmoqda...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Ovozli Suhbatga Qo'shilish
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              ref={jitsiContainerRef} 
              className="w-full rounded-lg overflow-hidden border border-border/50"
              data-testid="voice-chat-container"
            />
            
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleMute}
                className="h-12 w-12 rounded-full"
                data-testid="button-toggle-mute"
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                variant="destructive"
                size="lg"
                onClick={leaveVoiceChat}
                className="gap-2"
                data-testid="button-leave-voice-chat"
              >
                <PhoneOff className="h-4 w-4" />
                Chiqish
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
