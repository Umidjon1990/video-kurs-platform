import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Eye, EyeOff, GraduationCap, BookOpen, Users, Award,
  Zap, Shield, Star, ChevronRight, Lock, User
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  username: z.string().min(1, "Telefon yoki email kiriting"),
  password: z.string().min(1, "Parol kiriting"),
});

const forgotPasswordSchema = z.object({
  contactInfo: z.string().min(1, "Telefon yoki email kiriting"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const FEATURES = [
  { icon: BookOpen, label: "100+ Video Kurslar", sub: "A0 dan C2 gacha", color: "#7c3aed" },
  { icon: GraduationCap, label: "CEFR Sertifikat", sub: "Xalqaro standart", color: "#2563eb" },
  { icon: Users, label: "Jonli Darslar", sub: "Zoom & Jitsi", color: "#06b6d4" },
  { icon: Award, label: "AI Baholash", sub: "Arabiy insho", color: "#ec4899" },
];

const ORBS = [
  { top: "8%",  left: "12%",  size: 320, color: "rgba(124,58,237,0.18)",  blur: 80, dur: 14 },
  { top: "55%", left: "-5%",  size: 260, color: "rgba(37,99,235,0.15)",   blur: 70, dur: 18 },
  { top: "20%", left: "70%",  size: 200, color: "rgba(6,182,212,0.12)",   blur: 60, dur: 11 },
  { top: "70%", left: "55%",  size: 280, color: "rgba(236,72,153,0.10)",  blur: 90, dur: 22 },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { contactInfo: "" },
  });

  useEffect(() => {
    const saved = localStorage.getItem("rememberedUsername");
    if (saved) { form.setValue("username", saved); setRememberMe(true); }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleLogin = async (data: LoginFormData) => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", {
        username: data.username,
        password: data.password,
      });
      const response = await res.json();
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", data.username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }
      queryClient.setQueryData(["/api/auth/user"], response.user);
      toast({ title: "Xush kelibsiz!", description: "Tizimga muvaffaqiyatli kirdingiz" });
      const userRole = response.user.role;
      window.location.href = userRole === "admin" ? "/admin" : "/";
    } catch (error: any) {
      toast({ title: "Xato", description: error.message || "Login qilishda xatolik", variant: "destructive" });
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { contactInfo: data.contactInfo });
      toast({ title: "So'rov yuborildi", description: "Administrator sizga tez orada aloqaga chiqadi." });
      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
    } catch (error: any) {
      toast({ title: "Xato", description: error.message || "Xatolik yuz berdi", variant: "destructive" });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div
      className="min-h-screen flex overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0a0520 0%, #0d1440 50%, #0a0824 100%)" }}
    >
      {/* ── Injected keyframes ── */}
      <style>{`
        @keyframes login-orb { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.08)} 66%{transform:translate(-20px,15px) scale(0.94)} }
        @keyframes login-float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
        @keyframes login-glow-border { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes login-badge-in { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes login-star { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
        @keyframes login-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        @keyframes login-shimmer-btn { 0%{transform:translateX(-100%) skewX(-12deg)} 100%{transform:translateX(300%) skewX(-12deg)} }
        @keyframes login-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
        @keyframes dot-pulse { 0%,100%{opacity:0.15} 50%{opacity:0.45} }
      `}</style>

      {/* ── Aurora orbs ── */}
      {ORBS.map((o, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: o.top, left: o.left,
            width: o.size, height: o.size,
            background: o.color,
            borderRadius: "50%",
            filter: `blur(${o.blur}px)`,
            animation: `login-orb ${o.dur}s ease-in-out infinite`,
            animationDelay: `${i * 2.5}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Dot grid ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
      }} />

      {/* ═══════════════════ LEFT PANEL ═══════════════════ */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1 relative z-10">

        {/* Logo */}
        <div style={{ animation: "login-float 6s ease-in-out infinite", marginBottom: "48px" }}>
          <div className="flex items-center gap-4 mb-6">
            <div style={{ position: "relative" }}>
              {/* Ring pulses */}
              {[0, 0.5, 1].map((d) => (
                <div key={d} style={{
                  position: "absolute", inset: -8,
                  borderRadius: "50%",
                  border: "2px solid rgba(124,58,237,0.5)",
                  animation: `login-ring 2.4s ease-out infinite`,
                  animationDelay: `${d}s`,
                }} />
              ))}
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                boxShadow: "0 8px 0 0 #3b0764, 0 12px 32px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, fontWeight: 900, color: "#fff",
                position: "relative",
              }}>
                Z
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #a78bfa, #60a5fa, #67e8f9)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Zamonaviy
              </div>
              <div style={{ fontSize: 14, color: "rgba(167,139,250,0.7)", fontWeight: 600, letterSpacing: "0.3em", marginTop: -4 }}>
                EDU PLATFORM
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.7, maxWidth: 400, marginBottom: 40 }}>
            O'zingizni rivojlantiring. CEFR darajangizni oshiring.<br />
            Professional arab tili ta'limi platformasi.
          </p>

          {/* Feature chips */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "14px 20px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  animation: `login-badge-in 0.6s ease-out both`,
                  animationDelay: `${0.1 + i * 0.12}s`,
                  transition: "transform 0.2s",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${f.color}cc, ${f.color}88)`,
                  boxShadow: `0 4px 0 0 ${f.color}55, 0 6px 16px ${f.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <f.icon style={{ width: 20, height: 20, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{f.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{f.sub}</div>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats row */}
        <div style={{ display: "flex", gap: 32, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[["500+", "O'quvchilar"], ["100+", "Kurslar"], ["4.9★", "Reyting"]].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#a78bfa" }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL ═══════════════════ */}
      <div className="flex items-center justify-center w-full lg:w-auto lg:min-w-[480px] lg:max-w-[520px] p-6 relative z-10">

        {/* Back button */}
        <button
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
          style={{
            position: "absolute", top: 24, left: 24,
            display: "flex", alignItems: "center", gap: 6,
            color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10, padding: "6px 14px",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Asosiy sahifa
        </button>

        {/* 3D CARD */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: "100%",
            maxWidth: 440,
            position: "relative",
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.15s ease-out",
          }}
        >
          {/* Gradient border glow layer */}
          <div style={{
            position: "absolute", inset: -2, borderRadius: 28, zIndex: 0,
            background: "linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4, #ec4899, #7c3aed)",
            backgroundSize: "300% 300%",
            animation: "login-glow-border 4s ease infinite",
            filter: "blur(1px)",
          }} />

          {/* Card body */}
          <div style={{
            position: "relative", zIndex: 1,
            background: "linear-gradient(160deg, rgba(20,10,50,0.92) 0%, rgba(10,5,32,0.95) 100%)",
            borderRadius: 26,
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}>
            {/* Scanline shimmer */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "30%",
              background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
              pointerEvents: "none",
              animation: "login-scanline 6s linear infinite",
            }} />

            {/* Card inner padding */}
            <div style={{ padding: "40px 40px 36px" }}>

              {/* Header */}
              <div style={{ marginBottom: 32, textAlign: "center" }}>
                {/* Mobile logo */}
                <div className="lg:hidden flex justify-center mb-4">
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                    boxShadow: "0 6px 0 0 #3b0764, 0 10px 24px rgba(124,58,237,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 900, color: "#fff",
                  }}>Z</div>
                </div>
                <h1 style={{
                  fontSize: 28, fontWeight: 900,
                  background: "linear-gradient(135deg, #fff 30%, #a78bfa)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: 8,
                }}>
                  Tizimga kirish
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  Hisobingizga kiring va o'rganishni davom ettiring
                </p>
              </div>

              {/* Info box */}
              <div style={{
                marginBottom: 28,
                padding: "12px 16px",
                borderRadius: 14,
                background: "rgba(37,99,235,0.12)",
                border: "1px solid rgba(37,99,235,0.30)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <Shield style={{ width: 16, height: 16, color: "#60a5fa", flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "rgba(147,197,253,0.85)", fontSize: 12, lineHeight: 1.5 }}>
                  Administrator tomonidan berilgan login va parol bilan kiring.
                </p>
              </div>

              {/* Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>

                    {/* Username field */}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <div style={{ position: "relative" }}>
                            <div style={{
                              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                              pointerEvents: "none", zIndex: 2,
                            }}>
                              <User style={{ width: 16, height: 16, color: focusedField === "username" ? "#a78bfa" : "rgba(255,255,255,0.3)", transition: "color 0.2s" }} />
                            </div>
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                placeholder="Telefon yoki Email"
                                data-testid="input-username"
                                onFocus={() => setFocusedField("username")}
                                onBlur={() => setFocusedField(null)}
                                style={{
                                  width: "100%", paddingLeft: 44, paddingRight: 16,
                                  paddingTop: 14, paddingBottom: 14,
                                  background: focusedField === "username"
                                    ? "rgba(124,58,237,0.10)"
                                    : "rgba(255,255,255,0.04)",
                                  border: focusedField === "username"
                                    ? "1px solid rgba(124,58,237,0.6)"
                                    : "1px solid rgba(255,255,255,0.10)",
                                  borderRadius: 14,
                                  color: "#fff",
                                  fontSize: 14,
                                  outline: "none",
                                  transition: "all 0.2s",
                                  boxShadow: focusedField === "username"
                                    ? "0 0 0 3px rgba(124,58,237,0.15), 0 0 20px rgba(124,58,237,0.1)"
                                    : "none",
                                }}
                              />
                            </FormControl>
                            <FormMessage style={{ color: "#f87171", fontSize: 11, marginTop: 4 }} />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Password field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div style={{ position: "relative" }}>
                            <div style={{
                              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                              pointerEvents: "none", zIndex: 2,
                            }}>
                              <Lock style={{ width: 16, height: 16, color: focusedField === "password" ? "#a78bfa" : "rgba(255,255,255,0.3)", transition: "color 0.2s" }} />
                            </div>
                            <FormControl>
                              <input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Parol"
                                data-testid="input-password"
                                onFocus={() => setFocusedField("password")}
                                onBlur={() => setFocusedField(null)}
                                style={{
                                  width: "100%", paddingLeft: 44, paddingRight: 48,
                                  paddingTop: 14, paddingBottom: 14,
                                  background: focusedField === "password"
                                    ? "rgba(124,58,237,0.10)"
                                    : "rgba(255,255,255,0.04)",
                                  border: focusedField === "password"
                                    ? "1px solid rgba(124,58,237,0.6)"
                                    : "1px solid rgba(255,255,255,0.10)",
                                  borderRadius: 14,
                                  color: "#fff",
                                  fontSize: 14,
                                  outline: "none",
                                  transition: "all 0.2s",
                                  boxShadow: focusedField === "password"
                                    ? "0 0 0 3px rgba(124,58,237,0.15), 0 0 20px rgba(124,58,237,0.1)"
                                    : "none",
                                }}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                                background: "none", border: "none", cursor: "pointer", padding: 4,
                                color: "rgba(255,255,255,0.35)",
                              }}
                            >
                              {showPassword
                                ? <EyeOff style={{ width: 16, height: 16 }} />
                                : <Eye style={{ width: 16, height: 16 }} />
                              }
                            </button>
                            <FormMessage style={{ color: "#f87171", fontSize: 11, marginTop: 4 }} />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row: remember me + forgot */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(c === true)}
                        data-testid="checkbox-remember-me"
                        style={{ borderColor: "rgba(255,255,255,0.2)" }}
                      />
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Meni eslab qol</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      data-testid="link-forgot-password"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#a78bfa", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      Parolni unutdim?
                    </button>
                  </div>

                  {/* Submit button — 7D amber */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="button-login"
                    style={{
                      width: "100%", padding: "15px 24px",
                      borderRadius: 16,
                      background: isSubmitting
                        ? "linear-gradient(180deg, #78350f, #451a03)"
                        : "linear-gradient(180deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)",
                      border: "none",
                      boxShadow: isSubmitting
                        ? "0 2px 0 0 #78350f"
                        : "0 6px 0 0 #92400e, 0 8px 20px rgba(180,83,9,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                      color: "#1c0a00",
                      fontSize: 15, fontWeight: 800,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      transform: isSubmitting ? "translateY(4px)" : "translateY(0)",
                      transition: "all 0.12s ease",
                      position: "relative", overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) e.currentTarget.style.filter = "brightness(1.08)";
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
                    onMouseDown={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.transform = "translateY(4px)";
                        e.currentTarget.style.boxShadow = "0 2px 0 0 #92400e, 0 4px 10px rgba(180,83,9,0.3), inset 0 1px 0 rgba(255,255,255,0.25)";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 6px 0 0 #92400e, 0 8px 20px rgba(180,83,9,0.45), inset 0 1px 0 rgba(255,255,255,0.25)";
                      }
                    }}
                  >
                    {/* Shimmer */}
                    {!isSubmitting && (
                      <span style={{
                        position: "absolute", top: 0, bottom: 0, width: "40%",
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                        animation: "login-shimmer-btn 2.5s ease-in-out infinite",
                        pointerEvents: "none",
                      }} />
                    )}
                    <span style={{ position: "relative", zIndex: 1 }}>
                      {isSubmitting ? "Yuklanmoqda..." : "Tizimga kirish"}
                    </span>
                  </button>

                </form>
              </Form>

              {/* Bottom decoration */}
              <div style={{
                marginTop: 28, paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "center", gap: 6,
              }}>
                {["A0","A1","A2","B1","B2","C1","C2"].map((lvl, i) => (
                  <div key={lvl} style={{
                    padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: `hsla(${220 + i*20}, 70%, 50%, 0.15)`,
                    border: `1px solid hsla(${220 + i*20}, 70%, 60%, 0.3)`,
                    color: `hsla(${220 + i*20}, 80%, 75%, 0.9)`,
                  }}>{lvl}</div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent data-testid="dialog-forgot-password">
          <DialogHeader>
            <DialogTitle>Parolni tiklash</DialogTitle>
            <DialogDescription>
              Telefon yoki email kiriting. Administrator yangi parol o'rnatadi.
            </DialogDescription>
          </DialogHeader>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="+998901234567 yoki email@example.com" data-testid="input-forgot-password-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsForgotPasswordOpen(false); forgotPasswordForm.reset(); }} data-testid="button-cancel-forgot-password">
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={forgotPasswordForm.formState.isSubmitting} data-testid="button-submit-forgot-password">
                  {forgotPasswordForm.formState.isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
