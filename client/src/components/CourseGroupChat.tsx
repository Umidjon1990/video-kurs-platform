import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Circle, MessageCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  courseId: string;
  senderId: string;
  message: string;
  messageType: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    role: string;
  } | null;
}

interface OnlineUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
  lastActiveAt: string;
}

interface CourseGroupChatProps {
  courseId: string;
  currentUserId: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function CourseGroupChat({ courseId, currentUserId, isOpen = true, onToggle }: CourseGroupChatProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/courses', courseId, 'group-chat'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/group-chat`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: isOpen && !!courseId,
    refetchInterval: 5000,
  });

  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ['/api/courses', courseId, 'online-users'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/online-users`);
      if (!res.ok) throw new Error('Failed to fetch online users');
      return res.json();
    },
    enabled: isOpen && !!courseId,
    refetchInterval: 10000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/courses/${courseId}/group-chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'group-chat'] });
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Xabar yuborib bo'lmadi",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isOpen && courseId) {
      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      }).catch(() => {});
    }

    const interval = setInterval(() => {
      if (isOpen && courseId) {
        fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        }).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
        data-testid="button-open-group-chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="flex flex-col h-[500px] max-h-[70vh]" data-testid="card-group-chat">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Guruh Suhbati</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              <span>{onlineUsers.length} online</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Hali xabarlar yo'q</p>
                <p className="text-xs">Birinchi xabarni yuboring!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwnMessage = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.sender?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(msg.sender?.firstName, msg.sender?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium">
                            {msg.sender?.firstName} {msg.sender?.lastName}
                          </span>
                          {msg.sender?.role === 'instructor' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              O'qituvchi
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-3 border-t flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar yozing..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnlineUsersList({ courseId }: { courseId: string }) {
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ['/api/courses', courseId, 'online-users'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/online-users`);
      if (!res.ok) throw new Error('Failed to fetch online users');
      return res.json();
    },
    enabled: !!courseId,
    refetchInterval: 10000,
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  return (
    <Card data-testid="card-online-users">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Online Foydalanuvchilar ({onlineUsers.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {onlineUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Hozirda hech kim online emas
          </p>
        ) : (
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2" data-testid={`online-user-${user.id}`}>
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  {user.role === 'instructor' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                      O'qituvchi
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
