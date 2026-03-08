import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MessageSquare, MessagesSquare, UserCheck, Loader2 } from "lucide-react";

interface CuratorGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: { id: string; userId: string; firstName: string; lastName: string | null; phone: string | null }[];
}

export default function CuratorDashboard() {
  const { user } = useAuth();

  const { data: groups = [], isLoading } = useQuery<CuratorGroup[]>({
    queryKey: ["/api/curator/groups"],
  });

  const totalStudents = groups.reduce((s, g) => s + g.memberCount, 0);

  return (
    <div className="p-6 space-y-6" style={{ minHeight: "100%", background: "#0d0521" }}>
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-curator-welcome" style={{ color: "#e2e8f0" }}>
          Salom, {user?.firstName || "Kurator"}!
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Kurator boshqaruv paneli</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-group-count" style={{ color: "#e2e8f0" }}>{groups.length}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Guruhlar</p>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)" }}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)" }}>
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-student-count" style={{ color: "#e2e8f0" }}>{totalStudents}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Talabalar</p>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <MessagesSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>0</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Yangi xabarlar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "#e2e8f0" }}>Mening Guruhlarim</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : groups.length === 0 ? (
          <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <CardContent className="flex flex-col items-center py-12 gap-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Users className="w-12 h-12" />
              <p className="text-sm">Hali sizga guruh biriktirilmagan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <Card key={group.id} data-testid={`card-curator-group-${group.id}`} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate" style={{ color: "#e2e8f0" }}>{group.name}</CardTitle>
                    {group.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.4)" }}>{group.description}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Users className="w-3 h-3 mr-1" /> {group.memberCount}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {group.members.slice(0, 6).map(m => (
                      <Avatar key={m.userId} className="h-7 w-7" title={`${m.firstName} ${m.lastName || ""}`}>
                        <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "rgba(124,58,237,0.4)" }}>
                          {m.firstName?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.memberCount > 6 && (
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        +{group.memberCount - 6}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/group-chat/${group.id}`}>
                      <Button size="sm" variant="outline" data-testid={`button-group-chat-${group.id}`}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Guruh Chat
                      </Button>
                    </Link>
                    <Link href="/chat">
                      <Button size="sm" variant="ghost" data-testid={`button-messages-${group.id}`}>
                        <MessagesSquare className="w-4 h-4 mr-1" /> Xabarlar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
