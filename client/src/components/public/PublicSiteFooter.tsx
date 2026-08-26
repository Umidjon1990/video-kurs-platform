import { Link } from "wouter";
import { BookOpen, Mail, MapPin, Phone, Send, Youtube } from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { getSetting } from "@/lib/publicSite";

type PublicSiteFooterProps = {
  settings?: SiteSetting[];
};

export function PublicSiteFooter({ settings }: PublicSiteFooterProps) {
  const phone = getSetting(settings, "contact_phone", "contactPhone");
  const email = getSetting(settings, "contact_email", "contactEmail");
  const address = getSetting(settings, "contact_address", "contactAddress");
  const telegram = getSetting(settings, "contact_telegram", "telegram") || "https://t.me/zamonaviytalimuz";
  const youtube = getSetting(settings, "youtube");

  return (
    <footer className="zvd-footer" id="aloqa">
      <div className="zvd-container">
        <div className="zvd-footer-cta">
          <div>
            <span className="zvd-eyebrow">Keyingi qadam</span>
            <h2>O'rganishni bugundan boshlang.</h2>
            <p>Savolingiz bormi? Jamoamiz sizga mos kursni tanlashga yordam beradi.</p>
          </div>
          <a href={telegram} target="_blank" rel="noreferrer" className="zvd-primary-button">
            <Send size={18} /> Telegram orqali yozish
          </a>
        </div>

        <div className="zvd-footer-grid">
          <div className="zvd-footer-brand">
            <Link href="/" className="zvd-brand">
              <span className="zvd-brand-mark" aria-hidden="true"><BookOpen size={22} /></span>
              <span className="zvd-brand-copy"><strong>Zamonaviy</strong><span>Video Darslar</span></span>
            </Link>
            <p>Video qo'llanmalar, amaliy darslar va tizimli ta'lim — barchasi bir joyda.</p>
          </div>

          <div>
            <h3>Platforma</h3>
            <Link href="/explore">Barcha kurslar</Link>
            <Link href="/register">Ro'yxatdan o'tish</Link>
            <Link href="/login">Shaxsiy kabinet</Link>
          </div>

          <div>
            <h3>Huquqiy</h3>
            <Link href="/privacy">Maxfiylik siyosati</Link>
            <Link href="/terms">Foydalanish shartlari</Link>
          </div>

          <div>
            <h3>Aloqa</h3>
            {phone && <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone size={16} />{phone}</a>}
            {email && <a href={`mailto:${email}`}><Mail size={16} />{email}</a>}
            {address && <span><MapPin size={16} />{address}</span>}
            {youtube && <a href={youtube} target="_blank" rel="noreferrer"><Youtube size={16} />YouTube</a>}
          </div>
        </div>

        <div className="zvd-footer-bottom">
          <span>© {new Date().getFullYear()} Zamonaviy Video Darslar</span>
          <strong>Zamonaviy ta'lim loyihasi</strong>
        </div>
      </div>
    </footer>
  );
}
