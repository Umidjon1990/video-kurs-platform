import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  MessageSquare,
  Award,
  FileText,
  Wallet,
  ListChecks,
  LogOut,
  UsersRound,
  Zap,
  GraduationCap,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  activeColor: string;
  glowColor: string;
};

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, activeColor: "#a78bfa", glowColor: "rgba(167,139,250,0.6)" },
  { title: "Kurslar", url: "/admin/courses", icon: BookOpen, activeColor: "#60a5fa", glowColor: "rgba(96,165,250,0.6)" },
  { title: "Guruhlar", url: "/admin/groups", icon: UsersRound, activeColor: "#22d3ee", glowColor: "rgba(34,211,238,0.6)" },
  { title: "To'lovlar", url: "/admin/payments", icon: CreditCard, activeColor: "#34d399", glowColor: "rgba(52,211,153,0.6)" },
  { title: "Obunalar", url: "/admin/subscriptions", icon: Wallet, activeColor: "#fbbf24", glowColor: "rgba(251,191,36,0.6)" },
  { title: "Obuna Rejalari", url: "/admin/subscription-plans", icon: ListChecks, activeColor: "#f472b6", glowColor: "rgba(244,114,182,0.6)" },
  { title: "CMS", url: "/admin/cms", icon: FileText, activeColor: "#fb923c", glowColor: "rgba(251,146,60,0.6)" },
];

const instructorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, activeColor: "#a78bfa", glowColor: "rgba(167,139,250,0.6)" },
  { title: "Obunalar", url: "/instructor/subscriptions", icon: Wallet, activeColor: "#fbbf24", glowColor: "rgba(251,191,36,0.6)" },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare, activeColor: "#22d3ee", glowColor: "rgba(34,211,238,0.6)" },
];

const studentMenuItems: MenuItem[] = [
  { title: "Mening Kurslarim", url: "/", icon: BookOpen, activeColor: "#60a5fa", glowColor: "rgba(96,165,250,0.6)" },
  { title: "Guruhlarim", url: "/groups", icon: Users, activeColor: "#a78bfa", glowColor: "rgba(167,139,250,0.6)" },
  { title: "Natijalarim", url: "/results", icon: Award, activeColor: "#fbbf24", glowColor: "rgba(251,191,36,0.6)" },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare, activeColor: "#22d3ee", glowColor: "rgba(34,211,238,0.6)" },
];

const roleConfig = {
  admin:      { label: "Administrator", color: "#fca5a5", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"  },
  instructor: { label: "O'qituvchi",    color: "#fcd34d", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
  student:    { label: "Talaba",        color: "#67e8f9", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)" },
};

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  if (!user) return null;

  const menuItems =
    user.role === "admin" ? adminMenuItems
    : user.role === "instructor" ? instructorMenuItems
    : studentMenuItems;

  const role = roleConfig[user.role as keyof typeof roleConfig] ?? roleConfig.student;

  const handleLogout = () => { window.location.href = "/api/logout"; };

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Foydalanuvchi";
  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Sidebar
      collapsible="icon"
      data-testid="app-sidebar"
    >
      {/* Purple top glow line */}
      <div className="absolute inset-x-0 top-0 h-px z-20 pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.7),transparent)" }} />

      {/* Background ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: "rgba(124,58,237,0.6)" }} />
        <div className="absolute bottom-20 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
          style={{ background: "rgba(37,99,235,0.8)" }} />
      </div>

      {/* ── HEADER ── */}
      <SidebarHeader className="relative z-10 px-3 pt-4 pb-3 border-b border-white/[0.06]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#2563eb)",
              boxShadow: "0 0 14px rgba(124,58,237,0.7), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden leading-tight">
            <p className="text-[13px] font-black text-white tracking-tight">Zamonaviy</p>
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: "#a78bfa" }}>EDU Platform</p>
          </div>
        </div>

        {/* User card */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
              <AvatarFallback className="text-white font-bold text-[11px]"
                style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
              style={{
                background: "#34d399",
                borderColor: "#050218",
                boxShadow: "0 0 5px rgba(52,211,153,0.9)",
              }} />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1">
            <p className="text-[12px] font-bold text-white truncate" data-testid="sidebar-user-name">{fullName}</p>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: role.color, background: role.bg, border: `1px solid ${role.border}` }}
              data-testid="sidebar-user-role">
              <Zap className="w-2 h-2" />{role.label}
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── CONTENT ── */}
      <SidebarContent className="relative z-10 px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-bold tracking-[0.22em] uppercase px-2 mb-1.5 group-data-[collapsible=icon]:hidden"
            style={{ color: "rgba(255,255,255,0.2)" }}>
            Navigatsiya
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item, i) => {
                const isActive = item.url === "/"
                  ? location === "/"
                  : location === item.url || location.startsWith(item.url + "/");

                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: i * 0.05 }}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        className="relative h-9 rounded-xl border transition-all duration-200"
                        style={isActive ? {
                          background: "linear-gradient(135deg,rgba(124,58,237,0.22),rgba(37,99,235,0.14))",
                          border: "1px solid rgba(124,58,237,0.4)",
                          boxShadow: "0 0 12px rgba(124,58,237,0.18), inset 0 1px 0 rgba(255,255,255,0.07)",
                          color: "#fff",
                        } : {
                          background: "transparent",
                          border: "1px solid transparent",
                          color: "rgba(255,255,255,0.45)",
                        }}
                      >
                        <Link href={item.url} className="flex items-center gap-2.5 w-full px-2">
                          {/* Active left indicator */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                              style={{
                                background: `linear-gradient(180deg,${item.activeColor},rgba(37,99,235,0.8))`,
                                boxShadow: `0 0 8px ${item.glowColor}`,
                              }} />
                          )}
                          <item.icon
                            className="h-4 w-4 shrink-0 transition-all duration-200"
                            style={isActive ? {
                              color: item.activeColor,
                              filter: `drop-shadow(0 0 5px ${item.glowColor})`,
                            } : {}}
                          />
                          <span className="text-[13px] font-semibold truncate group-data-[collapsible=icon]:hidden flex-1">
                            {item.title}
                          </span>
                          {isActive && (
                            <ChevronRight className="h-3 w-3 shrink-0 group-data-[collapsible=icon]:hidden"
                              style={{ color: "rgba(255,255,255,0.25)" }} />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── FOOTER ── */}
      <SidebarFooter className="relative z-10 px-2 pb-3 pt-2 border-t border-white/[0.06]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Chiqish"
              data-testid="button-logout"
              className="h-9 rounded-xl border border-transparent transition-all duration-200"
              style={{ color: "rgba(248,113,113,0.55)" }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-[13px] font-semibold group-data-[collapsible=icon]:hidden">Chiqish</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
