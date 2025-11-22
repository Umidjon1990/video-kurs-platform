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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Kurslar", url: "/admin/courses", icon: BookOpen },
  { title: "To'lovlar", url: "/admin/payments", icon: CreditCard },
  { title: "Obunalar", url: "/admin/subscriptions", icon: Wallet },
  { title: "Obuna Rejalari", url: "/admin/subscription-plans", icon: ListChecks },
  { title: "CMS", url: "/admin/cms", icon: FileText },
];

const instructorMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Obunalar", url: "/instructor/subscriptions", icon: Wallet },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare },
];

const studentMenuItems: MenuItem[] = [
  { title: "Mening Kurslarim", url: "/", icon: BookOpen },
  { title: "Natijalarim", url: "/results", icon: Award },
  { title: "Xabarlar", url: "/chat", icon: MessageSquare },
];

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const menuItems =
    user?.role === "admin"
      ? adminMenuItems
      : user?.role === "instructor"
      ? instructorMenuItems
      : studentMenuItems;

  const handleLogout = async () => {
    try {
      // Backend'da GET /api/logout endpoint bor
      window.location.href = "/api/logout";
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Chiqishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const getUserFullName = () => {
    return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Foydalanuvchi";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(getUserFullName())}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold" data-testid="sidebar-user-name">
              {getUserFullName()}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="sidebar-user-role">
              {user.role === "admin"
                ? "Administrator"
                : user.role === "instructor"
                ? "O'qituvchi"
                : "Talaba"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigatsiya</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Chiqish</span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
