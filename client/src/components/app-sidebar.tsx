import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Settings,
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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
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
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  glow?: string;
};

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, color: "text-violet-400", glow: "rgba(139,92,246,0.5)" },
  { title: "Kurslar", url: "/admin/courses", icon: BookOpen, color: "text-blue-400", glow: "rgba(59,130,246,0.5)" },
  { title: "Guruhlar", url: "/admin/groups", icon: UsersRound, color: "text-cyan-400", glow: "rgba(34,211,238,0.5)" },
  { title: "To'lovlar", url: "/admin/payments", icon: CreditCard, color: "text-emerald-400", glow: "rgba(52,211,153,0.5)" },
  { title: "Obunalar", url: "/admin/subscriptions", icon: Wallet, color: "text-amber-400", glow: "rgba(251,191,36,0.5)" },
  { title: "Obuna Rejalari", url: "/admin/subscription-plans", icon: ListChecks, color: "text-pink-400", glow: "rgba(244,114,182,0.5)" },
  { title: "CMS", url: "/admin/cms", icon: FileText, color: "text-orange-400", glow: "rgba(251,146,60,0.5)" },
];

const instructorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-violet-400", glow: "rgba(139,92,246,0.5)" },
  { title: "Obunalar", url: "/instructor/subscriptions", icon: Wallet, color: "text-amber-400", glow: "rgba(251,191,36,0.5)" },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare, color: "text-cyan-400", glow: "rgba(34,211,238,0.5)" },
];

const studentMenuItems: MenuItem[] = [
  { title: "Mening Kurslarim", url: "/", icon: BookOpen, color: "text-blue-400", glow: "rgba(59,130,246,0.5)" },
  { title: "Natijalarim", url: "/results", icon: Award, color: "text-amber-400", glow: "rgba(251,191,36,0.5)" },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare, color: "text-cyan-400", glow: "rgba(34,211,238,0.5)" },
];

const roleConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  admin: { label: "Administrator", color: "text-red-300", bg: "bg-red-500/15", border: "border-red-500/30" },
  instructor: { label: "O'qituvchi", color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  student: { label: "Talaba", color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
};

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const menuItems =
    user?.role === "admin" ? adminMenuItems
    : user?.role === "instructor" ? instructorMenuItems
    : studentMenuItems;

  const role = roleConfig[user?.role || "student"] || roleConfig.student;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserFullName = () =>
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Foydalanuvchi";

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (!user) return null;

  const fullName = getUserFullName();

  return (
    <Sidebar
      collapsible="icon"
      data-testid="app-sidebar"
      className="border-r-0"
      style={{
        background: "linear-gradient(180deg, #0d0521 0%, #050218 50%, #0a0328 100%)",
        borderRight: "1px solid rgba(139,92,246,0.15)",
      }}
    >
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent z-10" />

      {/* Header */}
      <SidebarHeader className="px-4 pt-5 pb-4 border-b border-white/5">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2 mb-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              boxShadow: "0 0 16px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-black text-white tracking-tight leading-none">Zamonaviy</p>
            <p className="text-[10px] font-medium text-violet-400 tracking-widest uppercase">EDU Platform</p>
          </div>
        </motion.div>

        {/* User profile */}
        <motion.div
          className="flex items-center gap-3 p-2.5 rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
              <AvatarFallback
                className="text-white font-bold text-xs"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                  boxShadow: "0 0 12px rgba(124,58,237,0.5)",
                }}
              >
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#050218] bg-emerald-400"
              style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
            />
          </div>

          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate" data-testid="sidebar-user-name">
              {fullName}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${role.color} ${role.bg} border ${role.border}`}
              data-testid="sidebar-user-role"
            >
              <Zap className="w-2.5 h-2.5" />
              {role.label}
            </span>
          </div>
        </motion.div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase px-2 mb-2 group-data-[collapsible=icon]:hidden">
            Navigatsiya
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive =
                  item.url === "/"
                    ? location === "/"
                    : location === item.url || location.startsWith(item.url + "/");

                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.06 }}
                    >
                      <Link href={item.url}>
                        <div
                          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                          style={
                            isActive
                              ? {
                                  background: `linear-gradient(135deg, rgba(124,58,237,0.25), rgba(37,99,235,0.15))`,
                                  border: "1px solid rgba(124,58,237,0.35)",
                                  boxShadow: `0 0 16px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.08)`,
                                }
                              : {
                                  background: "transparent",
                                  border: "1px solid transparent",
                                }
                          }
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                              (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.08)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                            }
                          }}
                        >
                          {/* Active left bar */}
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                              style={{
                                background: "linear-gradient(180deg, #7c3aed, #2563eb)",
                                boxShadow: "0 0 8px rgba(124,58,237,0.8)",
                              }}
                              transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            />
                          )}

                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-all duration-200 ${isActive ? item.color : "text-white/40"}`}
                            style={isActive ? { filter: `drop-shadow(0 0 5px ${item.glow})` } : {}}
                          />

                          <span
                            className={`text-sm font-semibold transition-colors duration-200 group-data-[collapsible=icon]:hidden ${
                              isActive ? "text-white" : "text-white/50"
                            }`}
                          >
                            {item.title}
                          </span>

                          {isActive && (
                            <ChevronRight className="h-3.5 w-3.5 text-white/30 ml-auto group-data-[collapsible=icon]:hidden" />
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-3 pb-4 pt-3 border-t border-white/5">
        <motion.button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group-data-[collapsible=icon]:justify-center"
          style={{ border: "1px solid transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(239,68,68,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
          }}
          data-testid="button-logout"
          whileTap={{ scale: 0.97 }}
        >
          <LogOut className="h-4 w-4 text-red-400/60 shrink-0" />
          <span className="text-sm font-semibold text-red-400/60 group-data-[collapsible=icon]:hidden">
            Chiqish
          </span>
        </motion.button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
