import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  ExternalLink,
  Send,
  ArrowRight,
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { motion } from "framer-motion";
import type { SiteSetting } from "@shared/schema";

export function ModernFooter() {
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
  });

  const getSetting = (key: string) => {
    return siteSettings?.find((s) => s.key === key)?.value || "";
  };

  const currentYear = new Date().getFullYear();

  const defaultQuickLinks = [
    { href: "/", label: "Bosh sahifa" },
    { href: "/login", label: "Kirish" },
    { href: "/register", label: "Ro'yxatdan o'tish" },
  ];

  const defaultLegalLinks = [
    { href: "/privacy", label: "Maxfiylik siyosati" },
    { href: "/terms", label: "Foydalanish shartlari" },
  ];

  const getQuickLinks = () => {
    const saved = getSetting("footer_quick_links");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return defaultQuickLinks;
  };

  const getLegalLinks = () => {
    const saved = getSetting("footer_legal_links");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return defaultLegalLinks;
  };

  const quickLinks = getQuickLinks();
  const legalLinks = getLegalLinks();

  const socialLinks = [
    { key: "telegram", Icon: SiTelegram, label: "Telegram", color: "#229ED9" },
    { key: "instagram", Icon: Instagram, label: "Instagram", color: "#E1306C" },
    { key: "facebook", Icon: Facebook, label: "Facebook", color: "#1877F2" },
    { key: "youtube", Icon: Youtube, label: "YouTube", color: "#FF0000" },
  ].filter((s) => getSetting(s.key));

  return (
    <footer className="relative overflow-hidden wow-footer">
      {/* Aurora blobs in footer */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translate(-30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translate(30%, 30%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Top animated gradient border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] wow-header-border" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 mb-16 rounded-3xl p-px"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(37,99,235,0.4), rgba(6,182,212,0.4))",
          }}
        >
          <div
            className="rounded-3xl px-8 py-10 md:py-12 text-center"
            style={{ background: "rgba(10,5,32,0.85)", backdropFilter: "blur(20px)" }}
          >
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
              Bugun o'rganishni boshlang!
            </h3>
            <p className="text-white/60 mb-7 text-base max-w-xl mx-auto">
              Professional arab tili kurslari. O'zingizni rivojlantiring va yangi imkoniyatlar oching.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://t.me/zamonaviytalimuz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                  boxShadow: "0 0 30px rgba(124,58,237,0.4)",
                }}
              >
                <Send className="w-4 h-4" />
                Telegram orqali yozilish
              </a>
              <Link href="/explore">
                <button
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  Kurslarni ko'rish
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Main Footer Grid */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-t border-white/8">

          {/* Brand */}
          <div className="space-y-5 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4)" }}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl text-white">
                <span className="wow-shimmer-text">Zamonaviy</span>-EDU
              </span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              {getSetting("aboutDescription") ||
                "Professional video kurslar platformasi. Bilimingizni oshiring va kelajagingizni yarating!"}
            </p>

            {/* Social icons */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2.5 pt-1">
                {socialLinks.map(({ key, Icon, label, color }) => (
                  <a
                    key={key}
                    href={getSetting(key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      color,
                    }}
                    data-testid={`link-${key}`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          {quickLinks.length > 0 && (
            <div>
              <h3 className="font-bold text-white mb-5 text-sm uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.9)' }}>
                Tezkor havolalar
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors group"
                      >
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all" />
                        {link.label}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors cursor-pointer group">
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all" />
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legal Links */}
          {legalLinks.length > 0 && (
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'rgba(167,139,250,0.9)' }}>
                Huquqiy
              </h3>
              <ul className="space-y-3">
                {legalLinks.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors group"
                      >
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all" />
                        {link.label}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors cursor-pointer group">
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all" />
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'rgba(167,139,250,0.9)' }}>
              Aloqa
            </h3>
            <ul className="space-y-4">
              {getSetting("contactPhone") && (
                <li>
                  <a
                    href={`tel:${getSetting("contactPhone")}`}
                    className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      <Phone className="w-4 h-4 text-violet-400" />
                    </div>
                    {getSetting("contactPhone")}
                  </a>
                </li>
              )}
              {getSetting("contactEmail") && (
                <li>
                  <a
                    href={`mailto:${getSetting("contactEmail")}`}
                    className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}
                    >
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    {getSetting("contactEmail")}
                  </a>
                </li>
              )}
              {getSetting("contactAddress") && (
                <li>
                  <div className="flex items-start gap-3 text-sm text-white/50">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.3)" }}
                    >
                      <MapPin className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span>{getSetting("contactAddress")}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            © {currentYear} Zamonaviy-EDU. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/login">
              <span
                className="text-xs cursor-pointer transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.2)" }}
                data-testid="link-admin-panel"
              >
                Admin Panel
              </span>
            </Link>
            <p className="text-sm flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              O'zbekistonda ishlab chiqildi
              <span className="text-base">🇺🇿</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
