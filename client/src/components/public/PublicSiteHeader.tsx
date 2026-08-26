import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Kurslar", href: "/explore" },
  { label: "Aloqa", href: "/#aloqa" },
];

export function PublicSiteHeader() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setIsOpen(false), [location]);

  const followAnchor = (href: string) => {
    const [path, hash] = href.split("#");
    if (!hash) {
      navigate(path);
      return;
    }

    const scroll = () => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    if (location === "/") {
      scroll();
    } else {
      navigate(path || "/");
      window.setTimeout(scroll, 120);
    }
  };

  return (
    <header className={`zvd-header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="zvd-container zvd-header-inner">
        <Link href="/" className="zvd-brand" aria-label="Zamonaviy Video Darslar bosh sahifasi">
          <span className="zvd-brand-mark" aria-hidden="true">
            <BookOpen size={22} strokeWidth={2.2} />
          </span>
          <span className="zvd-brand-copy">
            <strong>Zamonaviy</strong>
            <span>Video Darslar</span>
          </span>
        </Link>

        <nav className="zvd-desktop-nav" aria-label="Asosiy navigatsiya">
          {navItems.map((item) => (
            <button key={item.label} type="button" onClick={() => followAnchor(item.href)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="zvd-header-actions">
          <Link href={user ? "/" : "/login"} className="zvd-login-link">
            {user ? <LayoutDashboard size={18} /> : <LogIn size={18} />}
            <span>{user ? "Kabinet" : "Kirish"}</span>
          </Link>
          <button
            type="button"
            className="zvd-menu-button"
            aria-label={isOpen ? "Menyuni yopish" : "Menyuni ochish"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav className="zvd-mobile-nav" aria-label="Mobil navigatsiya">
          <div className="zvd-container">
            {navItems.map((item) => (
              <button key={item.label} type="button" onClick={() => followAnchor(item.href)}>
                {item.label}
              </button>
            ))}
            <Link href={user ? "/" : "/login"}>
              {user ? "Shaxsiy kabinet" : "Tizimga kirish"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
