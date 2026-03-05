import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Menu,
  X,
  GraduationCap,
  LayoutDashboard,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User as UserType } from "@shared/schema";

export function ModernHeader() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin": return "/admin-dashboard";
      case "instructor": return "/instructor-dashboard";
      case "student": return "/student-dashboard";
      default: return "/";
    }
  };

  const navLinks = [
    { href: "/", label: "Bosh sahifa" },
    { href: "/about", label: "Biz haqimizda" },
    { href: "/contact", label: "Aloqa" },
  ];

  const isScrolled = scrolled;

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{
        background: isScrolled
          ? "hsl(var(--background) / 0.90)"
          : "rgba(10, 5, 32, 0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: isScrolled
          ? "1px solid hsl(var(--border) / 0.5)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isScrolled ? "0 4px 32px rgba(124,58,237,0.06)" : "none",
      }}
    >
      {/* Animated gradient bottom border line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] wow-header-border transition-opacity duration-500"
        style={{ opacity: isScrolled ? 0.5 : 0.7 }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative">
              <div
                className="wow-logo-ring absolute inset-0 rounded-xl"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", opacity: 0.5 }}
              />
              <div
                className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-shadow group-hover:shadow-violet-500/40"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 55%, #06b6d4 100%)" }}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-xl leading-none">
                <span className="wow-shimmer-text" style={{ fontSize: "inherit" }}>Zamonaviy</span>
                <span
                  className="transition-colors duration-500"
                  style={{ color: isScrolled ? "hsl(var(--foreground))" : "rgba(255,255,255,0.9)" }}
                >
                  -EDU
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full transition-all duration-500 wow-nav-pill">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <button
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
                  style={
                    location === link.href
                      ? {
                          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                          color: "white",
                          boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                        }
                      : {
                          color: isScrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.65)",
                          background: "transparent",
                        }
                  }
                  data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {link.label}
                </button>
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />

            {user ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setLocation(getDashboardLink())}
                  data-testid="button-notifications"
                  style={{ color: isScrolled ? undefined : "rgba(255,255,255,0.8)" }}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount && unreadCount.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                      {unreadCount.count > 9 ? "9+" : unreadCount.count}
                    </span>
                  )}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                      data-testid="button-user-menu"
                    >
                      <Avatar
                        className="h-9 w-9 border-2 transition-all"
                        style={{ borderColor: isScrolled ? "hsl(var(--primary) / 0.3)" : "rgba(255,255,255,0.4)" }}
                      >
                        <AvatarFallback
                          style={{
                            background: "linear-gradient(135deg, #7c3aed30, #2563eb30)",
                            color: isScrolled ? "hsl(var(--primary))" : "#a78bfa",
                          }}
                          className="font-semibold"
                        >
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ background: "linear-gradient(135deg, #7c3aed20, #2563eb20)", color: "hsl(var(--primary))" }}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{user.firstName} {user.lastName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation(getDashboardLink())} data-testid="menu-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-profile">
                      <User className="w-4 h-4 mr-2" />
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Chiqish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <button
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                    boxShadow: "0 0 20px rgba(124,58,237,0.35)",
                  }}
                  data-testid="button-login"
                >
                  Kirish
                </button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              style={{ color: isScrolled ? undefined : "rgba(255,255,255,0.8)" }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
            style={{
              background: isScrolled ? "hsl(var(--background) / 0.95)" : "rgba(10,5,32,0.95)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <nav className="flex flex-col p-4 gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <button
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={
                      location === link.href
                        ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "white" }
                        : { color: isScrolled ? "hsl(var(--foreground))" : "rgba(255,255,255,0.8)" }
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </button>
                </Link>
              ))}
              {user ? (
                <Link href={getDashboardLink()}>
                  <button
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                    style={{ color: isScrolled ? "hsl(var(--foreground))" : "rgba(255,255,255,0.8)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                </Link>
              ) : (
                <Link href="/login">
                  <button
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Kirish
                  </button>
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
