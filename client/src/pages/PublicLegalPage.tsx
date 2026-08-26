import { Link, useLocation } from "wouter";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SiteSetting } from "@shared/schema";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { usePublicPage } from "@/hooks/usePublicPage";
import "@/public-site.css";

const privacySections = [
  ["Qanday ma'lumotlar olinadi?", "Ro'yxatdan o'tish vaqtida ism, aloqa ma'lumoti va tizimga kirish uchun zarur ma'lumotlar olinishi mumkin. Kursdan foydalanish jarayonida dars progressi, test natijalari va to'lov holati saqlanadi."],
  ["Ma'lumotlardan foydalanish", "Ma'lumotlar akkauntni boshqarish, kurslarga kirish berish, o'quv jarayonini ko'rsatish va zarur xizmat xabarlarini yuborish uchun ishlatiladi."],
  ["Ma'lumotlar xavfsizligi", "Platforma maxfiy ma'lumotlarni himoyalash uchun texnik va tashkiliy choralarni qo'llaydi. Parollar ochiq ko'rinishda saqlanmaydi."],
  ["Uchinchi tomon xizmatlari", "Video ko'rsatish, to'lov yoki aloqa uchun YouTube, Telegram va boshqa xizmatlardan foydalanilganda ularning maxfiylik qoidalari ham amal qilishi mumkin."],
  ["Sizning huquqlaringiz", "Profil ma'lumotlaringizni yangilash yoki akkauntingizga tegishli ma'lumotlar bo'yicha murojaat qilish uchun platforma aloqa kanallaridan foydalanishingiz mumkin."],
];

const termsSections = [
  ["Platformadan foydalanish", "Foydalanuvchi akkaunt ma'lumotlarini to'g'ri kiritishi va o'z kirish ma'lumotlarini boshqa shaxslarga bermasligi kerak."],
  ["Kurs materiallari", "Video, matn, test va boshqa o'quv materiallari mualliflik huquqi bilan himoyalangan. Ularni ruxsatsiz ko'chirish, tarqatish yoki qayta sotish mumkin emas."],
  ["To'lov va kirish muddati", "Pullik kurs narxi va foydalanish muddati kurs sahifasida ko'rsatiladi. Kirish to'lov tasdiqlangandan keyin faollashtiriladi."],
  ["Akkaunt xavfsizligi", "Shubhali foydalanish, akkaunt ulashish yoki materiallarni noqonuniy tarqatish aniqlansa, platforma kirishni vaqtincha cheklashi mumkin."],
  ["Xizmatdagi o'zgarishlar", "Kurs tarkibi va platforma imkoniyatlari sifatni yaxshilash maqsadida yangilanib borishi mumkin. Muhim o'zgarishlar foydalanuvchiga ma'lum qilinadi."],
];

export default function PublicLegalPage() {
  const [location] = useLocation();
  const isPrivacy = location === "/privacy";
  const title = isPrivacy ? "Maxfiylik siyosati" : "Foydalanish shartlari";
  const description = isPrivacy
    ? "Zamonaviy Video Darslar platformasida shaxsiy ma'lumotlardan foydalanish tartibi."
    : "Zamonaviy Video Darslar platformasidan foydalanish qoidalari.";
  const sections = isPrivacy ? privacySections : termsSections;
  const Icon = isPrivacy ? ShieldCheck : FileText;

  usePublicPage(`${title} — Zamonaviy Video Darslar`, description);
  const { data: settings } = useQuery<SiteSetting[]>({ queryKey: ["/api/site-settings"], staleTime: 5 * 60_000 });

  return (
    <div className="zvd-site">
      <PublicSiteHeader />
      <main className="zvd-legal-page">
        <div className="zvd-container">
          <Link href="/" className="zvd-back-link"><ArrowLeft size={17} />Bosh sahifaga qaytish</Link>
          <div className="zvd-legal-heading">
            <span><Icon size={28} /></span>
            <p>Zamonaviy ta'lim loyihasi</p>
            <h1>{title}</h1>
            <small>Oxirgi yangilanish: 25-avgust, 2026-yil</small>
          </div>
          <div className="zvd-legal-content">
            <p className="zvd-legal-intro">{description} Quyidagi bandlar platforma va foydalanuvchi o'rtasidagi asosiy tamoyillarni tushuntiradi.</p>
            {sections.map(([heading, body], index) => (
              <section key={heading}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{heading}</h2><p>{body}</p></div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <PublicSiteFooter settings={settings} />
    </div>
  );
}
