import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Send,
  Youtube,
  ExternalLink
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import type { SiteSetting } from "@shared/schema";

export function ModernFooter() {
  const { data: siteSettings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
  });

  const getSetting = (key: string) => {
    return siteSettings?.find(s => s.key === key)?.value || "";
  };

  const currentYear = new Date().getFullYear();

  // Default links (used when no settings exist)
  const defaultQuickLinks = [
    { href: "/", label: "Bosh sahifa" },
    { href: "/login", label: "Kirish" },
    { href: "/register", label: "Ro'yxatdan o'tish" },
  ];
  
  const defaultLegalLinks = [
    { href: "/privacy", label: "Maxfiylik siyosati" },
    { href: "/terms", label: "Foydalanish shartlari" },
  ];

  // Get footer links from settings - if setting exists, use it (even if empty array)
  const getQuickLinks = () => {
    const saved = getSetting("footer_quick_links");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed; // Accept empty arrays too
      } catch {}
    }
    return defaultQuickLinks;
  };

  const getLegalLinks = () => {
    const saved = getSetting("footer_legal_links");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed; // Accept empty arrays too
      } catch {}
    }
    return defaultLegalLinks;
  };

  const quickLinks = getQuickLinks();
  const legalLinks = getLegalLinks();

  return (
    <footer className="relative bg-card border-t">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">
                <span className="text-gradient">Zamonaviy</span>-EDU
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {getSetting("aboutDescription") || "Professional video kurslar platformasi. Bilimingizni oshiring va kelajagingizni yarating!"}
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              {getSetting("telegram") && (
                <a 
                  href={getSetting("telegram")} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  data-testid="link-telegram"
                >
                  <SiTelegram className="w-4 h-4" />
                </a>
              )}
              {getSetting("instagram") && (
                <a 
                  href={getSetting("instagram")} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  data-testid="link-instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {getSetting("facebook") && (
                <a 
                  href={getSetting("facebook")} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  data-testid="link-facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {getSetting("youtube") && (
                <a 
                  href={getSetting("youtube")} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  data-testid="link-youtube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links - only show if there are links */}
          {quickLinks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4">Tezkor havolalar</h3>
              <ul className="space-y-2">
                {quickLinks.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer">
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legal Links - only show if there are links */}
          {legalLinks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4">Huquqiy</h3>
              <ul className="space-y-2">
                {legalLinks.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer">
                          {link.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Aloqa</h3>
            <ul className="space-y-3">
              {getSetting("contactPhone") && (
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`tel:${getSetting("contactPhone")}`} className="hover:text-primary transition-colors">
                    {getSetting("contactPhone")}
                  </a>
                </li>
              )}
              {getSetting("contactEmail") && (
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`mailto:${getSetting("contactEmail")}`} className="hover:text-primary transition-colors">
                    {getSetting("contactEmail")}
                  </a>
                </li>
              )}
              {getSetting("contactAddress") && (
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span>{getSetting("contactAddress")}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Zamonaviy-EDU. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <span className="text-xs text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer" data-testid="link-admin-panel">
                Admin Panel
              </span>
            </Link>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span>O'zbekistonda ishlab chiqildi</span>
              <span className="text-lg">🇺🇿</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
