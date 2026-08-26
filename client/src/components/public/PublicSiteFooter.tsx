import { Link } from "wouter";
import { BookOpen, Send } from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { getSetting } from "@/lib/publicSite";

type PublicSiteFooterProps = {
  settings?: SiteSetting[];
};

export function PublicSiteFooter({ settings }: PublicSiteFooterProps) {
  const telegram = getSetting(settings, "contact_telegram", "telegram") || "https://t.me/zamonaviytalimuz";

  return (
    <footer className="zvd-footer" id="aloqa">
      <div className="zvd-container">
        <div className="zvd-footer-main">
          <div className="zvd-footer-brand">
            <Link href="/" className="zvd-brand">
              <span className="zvd-brand-mark" aria-hidden="true"><BookOpen size={22} /></span>
              <span className="zvd-brand-copy"><strong>Zamonaviy</strong><span>Video Darslar</span></span>
            </Link>
            <p>Tartibli video darslar — barchasi bir joyda.</p>
          </div>

          <a href={telegram} target="_blank" rel="noreferrer" className="zvd-primary-button">
            <Send size={18} /> Telegram orqali yozish
          </a>
        </div>

        <nav className="zvd-footer-nav" aria-label="Footer navigatsiyasi">
          <Link href="/explore">Kurslar</Link>
          <Link href="/login">Kirish</Link>
          <Link href="/privacy">Maxfiylik</Link>
          <Link href="/terms">Foydalanish shartlari</Link>
        </nav>

        <div className="zvd-footer-bottom">
          <span>© {new Date().getFullYear()} Zamonaviy Video Darslar</span>
          <strong>Zamonaviy ta'lim loyihasi</strong>
        </div>
      </div>
    </footer>
  );
}
