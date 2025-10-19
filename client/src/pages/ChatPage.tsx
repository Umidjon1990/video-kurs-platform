import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function ChatPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasTriedToCreate, setHasTriedToCreate] = useState(false);
  
  // Extract userId from URL query parameters (check both userId and userid for robustness)
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const userIdParam = searchParams.get('userId') || searchParams.get('userid');
  
  console.log('ChatPage loaded - location:', location, 'userIdParam:', userIdParam, 'conversationId:', conversationId);

  // Fetch conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<any[]>({
    queryKey: ['/api/chat/conversations'],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery<any[]>({
    queryKey: ['/api/chat/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
  });

  // Create or get conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Determine which parameter to send based on current user role
      const params = user?.role === 'student' 
        ? { instructorId: userId }
        : { studentId: userId };
      
      console.log('Creating conversation with params:', params);
      return apiRequest('POST', '/api/chat/conversations', params);
    },
    onSuccess: (conversation: any) => {
      console.log('Conversation created successfully:', conversation);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      navigate(`/chat/${conversation.id}`);
      setHasTriedToCreate(false);
    },
    onError: (error: any) => {
      console.error('Error creating conversation:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Suhbat yaratishda xatolik yuz berdi",
        variant: "destructive",
      });
      setHasTriedToCreate(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) return;
      return apiRequest('POST', `/api/chat/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Xatolik",
        description: error.message || "Xabar yuborishda xatolik yuz berdi",
        variant: "destructive",
      });
    },
  });

  // Handle userId parameter - create or get conversation
  useEffect(() => {
    console.log('useEffect check:', {
      userIdParam,
      userId: user?.id,
      conversationId,
      hasTriedToCreate,
      isPending: createConversationMutation.isPending
    });
    
    if (userIdParam && user && !conversationId && !hasTriedToCreate && !createConversationMutation.isPending) {
      console.log('Attempting to create conversation for userId:', userIdParam);
      setHasTriedToCreate(true);
      createConversationMutation.mutate(userIdParam);
    }
  }, [userIdParam, user, conversationId, hasTriedToCreate]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId && Array.isArray(messages) && messages.length > 0) {
      apiRequest('PATCH', `/api/chat/conversations/${conversationId}/read`, {});
    }
  }, [conversationId, messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate(messageContent);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  const selectedConversation = conversations?.find((c: any) => c.id === conversationId);
  const otherUser = selectedConversation 
    ? (user?.role === 'student' 
        ? {
            firstName: selectedConversation.instructorFirstName,
            lastName: selectedConversation.instructorLastName,
            email: selectedConversation.instructorEmail,
            profileImageUrl: selectedConversation.instructorProfileImageUrl,
          }
        : {
            firstName: selectedConversation.studentFirstName,
            lastName: selectedConversation.studentLastName,
            email: selectedConversation.studentEmail,
            profileImageUrl: selectedConversation.studentProfileImageUrl,
          })
    : null;

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <Link href={user?.role === 'instructor' ? '/' : '/'}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-lg font-semibold">Xabarlar</h2>
            <div className="w-10" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoadingConversations ? (
            <div className="p-4 text-center text-muted-foreground">
              Yuklanmoqda...
            </div>
          ) : conversations?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Hali xabarlar yo'q</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations?.map((conv: any) => {
                const otherUserInfo = user?.role === 'student'
                  ? {
                      firstName: conv.instructorFirstName,
                      lastName: conv.instructorLastName,
                      email: conv.instructorEmail,
                      profileImageUrl: conv.instructorProfileImageUrl,
                    }
                  : {
                      firstName: conv.studentFirstName,
                      lastName: conv.studentLastName,
                      email: conv.studentEmail,
                      profileImageUrl: conv.studentProfileImageUrl,
                    };

                return (
                  <Card
                    key={conv.id}
                    className={`p-3 mb-2 cursor-pointer hover-elevate ${
                      conversationId === conv.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherUserInfo.profileImageUrl} />
                        <AvatarFallback>
                          {getInitials(otherUserInfo.firstName, otherUserInfo.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {otherUserInfo.firstName} {otherUserInfo.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {otherUserInfo.email}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {conversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={otherUser?.profileImageUrl} />
                  <AvatarFallback>
                    {getInitials(otherUser?.firstName, otherUser?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {otherUser?.firstName} {otherUser?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{otherUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages ? (
                <div className="text-center text-muted-foreground">
                  Yuklanmoqda...
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Hali xabarlar yo'q. Birinchi xabarni yuboring!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages?.map((msg: any) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`p-3 rounded-lg ${
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-1">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Xabar yozing..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Suhbatni tanlang</p>
              <p className="text-sm">Xabarlarni ko'rish uchun suhbatni tanlang</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
