import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Reply, X, Users, Shield, Loader2 } from "lucide-react";

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  replyToId: string | null;
  createdAt: string;
  senderFirstName: string;
  senderLastName: string | null;
  senderRole: string;
  replyTo: { id: string; content: string; senderFirstName: string } | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Bugun";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return d.toLocaleDateString("uz", { day: "numeric", month: "long" });
}

export default function GroupChat() {
  const [, params] = useRoute("/group-chat/:groupId");
  const groupId = params?.groupId || "";
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  const { data: messages = [], isLoading } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", groupId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
    enabled: !!groupId,
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: string }) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/messages`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "messages"] });
      setMessage("");
      setReplyTo(null);
    },
  });

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length - prevLenRef.current > 3 ? "auto" : "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim(), replyToId: replyTo?.id });
  };

  const roleColor = (role: string) => {
    if (role === "curator") return "#a78bfa";
    if (role === "admin") return "#f87171";
    if (role === "instructor") return "#fbbf24";
    return "#67e8f9";
  };

  let lastDate = "";

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0521" }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(124,58,237,0.2)", background: "rgba(13,5,33,0.95)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm" data-testid="text-group-chat-title">Guruh Savol-Javob</p>
          <p className="text-white/40 text-xs">{messages.length} ta xabar</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
            <Users className="w-12 h-12" />
            <p className="text-sm">Hali xabar yo'q. Birinchi bo'lib savol bering!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => {
              const isOwn = msg.senderId === (user?.id || "");
              const msgDate = formatDate(msg.createdAt);
              let showDateSep = false;
              if (msgDate !== lastDate) {
                showDateSep = true;
                lastDate = msgDate;
              }

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-white/30 px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                        {msgDate}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1.5 group`} data-testid={`message-${msg.id}`}>
                    <div className={`flex gap-2 max-w-[85%] ${isOwn ? "flex-row-reverse" : ""}`}>
                      {!isOwn && (
                        <Avatar className="h-7 w-7 shrink-0 mt-1">
                          <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: roleColor(msg.senderRole) }}>
                            {(msg.senderFirstName?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        {!isOwn && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-semibold" style={{ color: roleColor(msg.senderRole) }}>
                              {msg.senderFirstName} {msg.senderLastName || ""}
                            </span>
                            {(msg.senderRole === "curator" || msg.senderRole === "admin") && (
                              <Badge variant="outline" className="text-[8px] py-0 px-1 h-3.5 no-default-hover-elevate no-default-active-elevate" style={{ borderColor: roleColor(msg.senderRole), color: roleColor(msg.senderRole) }}>
                                <Shield className="w-2 h-2 mr-0.5" />
                                {msg.senderRole === "curator" ? "Kurator" : "Admin"}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div
                          className="rounded-xl px-3 py-2 cursor-pointer"
                          style={{
                            background: isOwn
                              ? "linear-gradient(135deg,rgba(124,58,237,0.35),rgba(37,99,235,0.25))"
                              : "rgba(255,255,255,0.06)",
                            border: isOwn ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          }}
                          onClick={() => setReplyTo(msg)}
                        >
                          {msg.replyTo && (
                            <div className="mb-1.5 pl-2 py-1 rounded text-[11px]" style={{ borderLeft: "2px solid rgba(124,58,237,0.5)", background: "rgba(124,58,237,0.08)" }}>
                              <span className="text-purple-400 font-medium">{msg.replyTo.senderFirstName}</span>
                              <p className="text-white/40 truncate">{msg.replyTo.content}</p>
                            </div>
                          )}
                          <p className="text-white/90 text-[13px] whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwn ? "text-right" : ""}`} style={{ color: "rgba(255,255,255,0.25)" }}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      className="invisible group-hover:visible self-center mx-1 p-1 rounded text-white/20 hover:text-white/50"
                      onClick={() => setReplyTo(msg)}
                      data-testid={`button-reply-${msg.id}`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2" style={{ background: "rgba(13,5,33,0.95)" }}>
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <Reply className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="text-purple-400 font-medium">{replyTo.senderFirstName}:</span>
            <span className="text-white/50 truncate flex-1">{replyTo.content}</span>
            <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/60" data-testid="button-cancel-reply">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            data-testid="input-group-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Savol yozing..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending} data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
