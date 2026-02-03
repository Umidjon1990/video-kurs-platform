import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, PhoneOff, Volume2, Loader2, ExternalLink } from "lucide-react";

interface CourseVoiceChatProps {
  courseId: string;
  courseTitle: string;
  currentUserId: string;
  userName: string;
}

export function CourseVoiceChat({ courseId, courseTitle, currentUserId, userName }: CourseVoiceChatProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const roomName = `zamonaviy-edu-voice-${courseId.replace(/-/g, '').substring(0, 20)}`;
  const displayName = encodeURIComponent(userName);
  
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${displayName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=true&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","hangup","participants-pane","settings"]`;
  
  const joinVoiceChat = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsJoined(true);
      setIsLoading(false);
    }, 500);
  };
  
  const leaveVoiceChat = () => {
    setIsJoined(false);
  };
  
  const openInNewTab = () => {
    window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
  };
  
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
            <div className="flex flex-col sm:flex-row gap-3">
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
              <Button 
                onClick={openInNewTab} 
                variant="outline"
                size="lg"
                data-testid="button-open-voice-new-tab"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Yangi Oynada Ochish
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full rounded-lg overflow-hidden border border-border/50 bg-background">
              <iframe
                src={jitsiUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-[400px]"
                style={{ border: 'none' }}
                data-testid="voice-chat-iframe"
              />
            </div>
            
            <div className="flex items-center justify-center gap-3">
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
              
              <Button 
                onClick={openInNewTab} 
                variant="outline"
                size="lg"
                data-testid="button-open-fullscreen"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Katta Ekranda
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
