import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, ArrowLeft, User, Clock, ChevronLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Hozir";
  if (mins < 60) return `${mins}d`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}s`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}k`;
  return d.toLocaleDateString("uz", { day: "numeric", month: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Bugun";
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return d.toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export default function ChatPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasTriedToCreate, setHasTriedToCreate] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const userIdParam = searchParams.get("userId") || searchParams.get("userid");

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<any[]>({
    queryKey: ["/api/chat/conversations"],
    refetchInterval: 8000,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<any[]>({
    queryKey: ["/api/chat/conversations", conversationId, "messages"],
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const params = user?.role === "student"
        ? { instructorId: userId }
        : { studentId: userId };
      const response = await apiRequest("POST", "/api/chat/conversations", params);
      return await response.json();
    },
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      if (conversation?.id) {
        navigate(`/chat/${conversation.id}`);
        setMobileShowChat(true);
      }
      setHasTriedToCreate(false);
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      setHasTriedToCreate(false);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) return;
      return apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (userIdParam && user && !conversationId && !hasTriedToCreate && !createConversationMutation.isPending) {
      setHasTriedToCreate(true);
      createConversationMutation.mutate(userIdParam);
    }
  }, [userIdParam, user, conversationId, hasTriedToCreate]);

  useEffect(() => {
    if (conversationId && Array.isArray(messages) && messages.length > 0) {
      apiRequest("PATCH", `/api/chat/conversations/${conversationId}/read`, {});
    }
  }, [conversationId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversationId) setMobileShowChat(true);
  }, [conversationId]);

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate(messageContent);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  const selectedConversation = conversations.find((c: any) => c.id === conversationId);
  const isStudent = user?.role === "student";

  const getOtherUser = (conv: any) => {
    if (isStudent) {
      return {
        firstName: conv.instructorFirstName,
        lastName: conv.instructorLastName,
        email: conv.instructorEmail,
        profileImageUrl: conv.instructorProfileImageUrl,
      };
    }
    return {
      firstName: conv.studentFirstName,
      lastName: conv.studentLastName,
      email: conv.studentEmail,
      profileImageUrl: conv.studentProfileImageUrl,
    };
  };

  const otherUser = selectedConversation ? getOtherUser(selectedConversation) : null;

  const isCuratorOrInstructor = user?.role === "curator" || user?.role === "instructor";

  let groupedMessages: { date: string; msgs: any[] }[] = [];
  if (messages.length > 0) {
    let currentDate = "";
    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groupedMessages.push({ date: msg.createdAt, msgs: [] });
      }
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex h-full" style={{ background: "#0d0521" }}>
      {/* Conversations List */}
      <div
        className={`w-full sm:w-80 lg:w-96 shrink-0 flex flex-col border-r ${mobileShowChat && conversationId ? "hidden sm:flex" : "flex"}`}
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
      >
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
              <MessageCircle className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }} data-testid="text-chat-title">
                {isCuratorOrInstructor ? "O'quvchilar Xabarlari" : "Xabarlar"}
              </h2>
              {isCuratorOrInstructor && (
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Har bir o'quvchi bilan alohida yozishma
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {isLoadingConversations ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "rgba(255,255,255,0.2)" }}>
              <MessageCircle className="w-12 h-12" />
              <p className="text-sm">Hali xabarlar yo'q</p>
              {isCuratorOrInstructor && (
                <p className="text-xs text-center px-4" style={{ color: "rgba(255,255,255,0.15)" }}>
                  O'quvchilar sizga xabar yuborganda bu yerda ko'rinadi
                </p>
              )}
            </div>
          ) : (
            conversations.map((conv: any) => {
              const other = getOtherUser(conv);
              const isSelected = conversationId === conv.id;
              const hasUnread = (conv.unreadCount || 0) > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    navigate(`/chat/${conv.id}`);
                    setMobileShowChat(true);
                  }}
                  data-testid={`conversation-${conv.id}`}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(37,99,235,0.12))"
                      : hasUnread
                        ? "rgba(124,58,237,0.06)"
                        : "transparent",
                    border: isSelected
                      ? "1px solid rgba(124,58,237,0.35)"
                      : "1px solid transparent",
                    boxShadow: isSelected ? "0 0 16px rgba(124,58,237,0.12)" : "none",
                  }}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={other.profileImageUrl} />
                      <AvatarFallback
                        className="text-xs font-bold"
                        style={{
                          background: isSelected ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)",
                          color: isSelected ? "#c084fc" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {getInitials(other.firstName, other.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 0 8px rgba(124,58,237,0.5)" }}>
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: hasUnread ? "#e2e8f0" : "rgba(255,255,255,0.7)" }}>
                        {other.firstName} {other.lastName}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] shrink-0" style={{ color: hasUnread ? "#a78bfa" : "rgba(255,255,255,0.2)" }}>
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs truncate mt-0.5" style={{ color: hasUnread ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                        {conv.lastMessageSenderId === user?.id ? "Siz: " : ""}{conv.lastMessage}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowChat && conversationId ? "" : !conversationId ? "hidden sm:flex" : "flex"}`}>
        {conversationId && otherUser ? (
          <>
            {/* Chat Header */}
            <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <button
                onClick={() => { setMobileShowChat(false); navigate("/chat"); }}
                className="sm:hidden p-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                data-testid="button-back-to-list"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Avatar className="w-9 h-9">
                <AvatarImage src={otherUser.profileImageUrl} />
                <AvatarFallback className="text-xs font-bold" style={{ background: "rgba(124,58,237,0.2)", color: "#c084fc" }}>
                  {getInitials(otherUser.firstName, otherUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#e2e8f0" }} data-testid="text-chat-partner-name">
                  {otherUser.firstName} {otherUser.lastName}
                </p>
                <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{otherUser.email}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "rgba(255,255,255,0.15)" }}>
                  <MessageCircle className="w-14 h-14" />
                  <p className="text-sm">Hali xabarlar yo'q</p>
                  <p className="text-xs">Birinchi xabarni yuboring</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex items-center justify-center py-3">
                        <span className="text-[10px] font-medium px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                          {formatDateSeparator(group.date)}
                        </span>
                      </div>
                      {group.msgs.map((msg: any) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}
                            data-testid={`message-${msg.id}`}
                          >
                            <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                              <div
                                className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                                style={isMine ? {
                                  background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                                  color: "#fff",
                                  borderBottomRightRadius: "6px",
                                } : {
                                  background: "rgba(255,255,255,0.06)",
                                  color: "#e2e8f0",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  borderBottomLeftRadius: "6px",
                                }}
                              >
                                {msg.content}
                              </div>
                              <span className="text-[10px] mt-1 px-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex gap-2">
                <Input
                  placeholder="Xabar yozing..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-message"
                  className="flex-1 border-0 text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#e2e8f0" }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  size="icon"
                  data-testid="button-send-message"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.12)" }}>
            <div className="text-center space-y-3">
              <MessageCircle className="w-16 h-16 mx-auto" />
              <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                {isCuratorOrInstructor ? "O'quvchini tanlang" : "Suhbatni tanlang"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
                {isCuratorOrInstructor
                  ? "Chap tarafdan o'quvchini tanlang - har bir o'quvchi bilan alohida yozishma"
                  : "Xabarlarni ko'rish uchun suhbatni tanlang"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
