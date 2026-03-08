import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Megaphone, Clock, User, Plus, Trash2, Loader2, Zap } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  targetType: string;
  createdAt: string;
  senderName?: string;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Hozirgina";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} kun oldin`;
  return d.toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [createDialog, setCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSenderName, setNewSenderName] = useState("");
  const [newPriority, setNewPriority] = useState<"normal" | "urgent">("normal");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const apiPath = isAdmin ? "/api/admin/announcements" : "/api/announcements";

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: [apiPath],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; priority: string; senderName: string }) => {
      const res = await apiRequest("POST", "/api/admin/announcements", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/urgent"] });
      setCreateDialog(false);
      setNewTitle("");
      setNewMessage("");
      setNewSenderName("");
      setNewPriority("normal");
      toast({ title: "E'lon yuborildi", description: `${data.recipientCount} kishiga yuborildi` });
    },
    onError: (err: any) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/urgent"] });
      setDeleteId(null);
      toast({ title: "E'lon o'chirildi" });
    },
  });

  return (
    <div className="min-h-full" style={{ background: "#0d0521" }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#e2e8f0" }} data-testid="text-announcements-title">E'lonlar</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {isAdmin ? "Barcha foydalanuvchilarga e'lon yuborish" : "Muhim xabarlar va yangiliklar"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setCreateDialog(true)}
              className="gap-2"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
              data-testid="button-create-announcement"
            >
              <Plus className="w-4 h-4" />
              Yangi E'lon
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            <Megaphone className="w-16 h-16" />
            <p className="text-sm">Hozircha e'lonlar yo'q</p>
            {isAdmin && (
              <Button variant="outline" onClick={() => setCreateDialog(true)} className="mt-2 gap-2">
                <Plus className="w-4 h-4" /> Birinchi e'lonni yarating
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const isUrgent = a.priority === "urgent";
              return (
                <div
                  key={a.id}
                  data-testid={`announcement-${a.id}`}
                  className="rounded-2xl p-5 transition-all duration-300"
                  style={{
                    background: isUrgent
                      ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(234,88,12,0.08))"
                      : "rgba(255,255,255,0.03)",
                    border: isUrgent
                      ? "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isUrgent ? "0 0 24px rgba(239,68,68,0.08)" : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isUrgent ? (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                          <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
                          <Megaphone className="w-4.5 h-4.5 text-purple-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold" style={{ color: isUrgent ? "#fca5a5" : "#e2e8f0" }}>{a.title}</h3>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              MUHIM
                            </Badge>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(a.id)}
                            className="shrink-0 text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                            data-testid={`button-delete-announcement-${a.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
                          <User className="w-3 h-3" style={{ color: "#a78bfa" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "#c084fc" }} data-testid={`text-sender-${a.id}`}>{a.senderName || "Admin"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>{a.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-lg" style={{ background: "#120830", border: "1px solid rgba(124,58,237,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#e2e8f0" }} data-testid="text-create-announcement-title">Yangi E'lon Yaratish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Sarlavha</label>
              <Input
                data-testid="input-announcement-title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="E'lon sarlavhasi..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Muallif (kimdan)</label>
              <Input
                data-testid="input-announcement-sender"
                value={newSenderName}
                onChange={e => setNewSenderName(e.target.value)}
                placeholder="Masalan: Admin, O'qituvchi Anvar, Zamonaviy EDU..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Bo'sh qoldirilsa, sizning ismingiz ko'rsatiladi
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Xabar matni</label>
              <Textarea
                data-testid="input-announcement-message"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="E'lon mazmunini yozing..."
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Muhimlik darajasi</label>
              <div className="flex gap-3">
                <button
                  data-testid="button-priority-normal"
                  onClick={() => setNewPriority("normal")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${newPriority === "normal" ? "" : "opacity-50"}`}
                  style={{
                    background: newPriority === "normal" ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                    border: newPriority === "normal" ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: newPriority === "normal" ? "#c084fc" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <Megaphone className="w-4 h-4" />
                  Oddiy
                </button>
                <button
                  data-testid="button-priority-urgent"
                  onClick={() => setNewPriority("urgent")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${newPriority === "urgent" ? "" : "opacity-50"}`}
                  style={{
                    background: newPriority === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.03)",
                    border: newPriority === "urgent" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: newPriority === "urgent" ? "#fca5a5" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Muhim (Urgent)
                </button>
              </div>
              {newPriority === "urgent" && (
                <p className="text-[11px] flex items-center gap-1.5 mt-1" style={{ color: "rgba(239,68,68,0.6)" }}>
                  <AlertTriangle className="w-3 h-3" />
                  Muhim e'lon barcha sahifalarda banner sifatida 72 soat davomida ko'rinadi
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialog(false)} data-testid="button-cancel-announcement">Bekor qilish</Button>
            <Button
              onClick={() => createMutation.mutate({ title: newTitle, message: newMessage, priority: newPriority, senderName: newSenderName })}
              disabled={!newTitle.trim() || !newMessage.trim() || createMutation.isPending}
              data-testid="button-submit-announcement"
              style={{ background: newPriority === "urgent" ? "linear-gradient(135deg,#dc2626,#ea580c)" : "linear-gradient(135deg,#7c3aed,#2563eb)" }}
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yuborilmoqda...</> : "E'lonni Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent style={{ background: "#120830", border: "1px solid rgba(239,68,68,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#fca5a5" }}>E'lonni o'chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Bu e'lonni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-announcement"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
