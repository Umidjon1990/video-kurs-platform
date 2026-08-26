import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlay,
  Clock3,
  GraduationCap,
  Headphones,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { PublicCourseCard } from "@/components/public/PublicCourseCard";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { usePublicPage } from "@/hooks/usePublicPage";
import {
  courseImage,
  effectiveCoursePrice,
  formatPrice,
  instructorName,
  type PublicCourse,
  type PublicLanguageLevel,
} from "@/lib/publicSite";
import "@/public-site.css";

type CourseFilter = "all" | "free" | "paid";

function CourseGridSkeleton() {
  return (
    <div className="zvd-course-grid" aria-label="Kurslar yuklanmoqda">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="zvd-course-skeleton" key={index}>
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

export default function PublicHomePage() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [levelId, setLevelId] = useState("");

  usePublicPage(
    "Zamonaviy Video Darslar — Bilimni videoda o'rganing",
    "O'zbek tilidagi amaliy video darslar, qo'llanmalar va kurslar. Bepul demo darslarni tomosha qiling va o'zingizga mos kursni tanlang.",
  );

  const { data: courses = [], isLoading, isError } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public"],
    staleTime: 60_000,
  });
  const { data: settings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60_000,
  });
  const { data: levels = [] } = useQuery<PublicLanguageLevel[]>({
    queryKey: ["/api/language-levels"],
    staleTime: 5 * 60_000,
  });

  const lessonCountQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: [`/api/courses/${course.id}/lessons/public`],
      enabled: course.lessonsCount == null,
      staleTime: 60_000,
    })),
  });

  const catalogueCourses = useMemo(
    () => courses.map((course, index) => ({
      ...course,
      lessonsCount: course.lessonsCount ?? (Array.isArray(lessonCountQueries[index]?.data) ? lessonCountQueries[index].data.length : 0),
    })),
    [courses, lessonCountQueries],
  );

  useEffect(() => {
    if (location === "/explore" && !isLoading) {
      window.setTimeout(() => {
        document.getElementById("kurslar")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [isLoading, location]);

  const featuredCourse = useMemo(
    () => catalogueCourses.find((course) => !course.isFree && Number(course.price) > 0) || catalogueCourses[0],
    [catalogueCourses],
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("uz");
    return catalogueCourses.filter((course) => {
      const isFree = Boolean(course.isFree) || Number(course.price) === 0;
      const matchesFilter = filter === "all" || (filter === "free" ? isFree : !isFree);
      const matchesLevel = !levelId || course.levelId === levelId;
      const matchesSearch = !normalizedSearch || [course.title, course.description, course.author, course.category]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("uz").includes(normalizedSearch));
      return matchesFilter && matchesLevel && matchesSearch;
    });
  }, [catalogueCourses, filter, levelId, search]);

  const stats = useMemo(() => ({
    students: catalogueCourses.reduce((sum, course) => sum + (course.enrollmentsCount || 0), 0),
    lessons: catalogueCourses.reduce((sum, course) => sum + (course.lessonsCount || 0), 0),
    free: catalogueCourses.filter((course) => course.isFree || Number(course.price) === 0).length,
  }), [catalogueCourses]);

  const jumpToCourses = () => document.getElementById("kurslar")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="zvd-site">
      <PublicSiteHeader />

      <main>
        <section className="zvd-hero">
          <div className="zvd-hero-grid" aria-hidden="true" />
          <div className="zvd-hero-orb zvd-hero-orb-one" aria-hidden="true" />
          <div className="zvd-hero-orb zvd-hero-orb-two" aria-hidden="true" />

          <div className="zvd-container zvd-hero-layout">
            <div className="zvd-hero-copy">
              <div className="zvd-hero-kicker">
                <Sparkles size={16} /> O'zbek tilidagi zamonaviy ta'lim platformasi
              </div>
              <h1>
                Bilimni tomosha qiling.
                <span>Natijani hayotda qo'llang.</span>
              </h1>
              <p>
                Mualliflik qo'llanmalari, video darslar va amaliy topshiriqlarni bitta qulay platformada o'rganing.
              </p>

              <div className="zvd-hero-actions">
                <button type="button" className="zvd-primary-button" onClick={jumpToCourses}>
                  Kurslarni ko'rish <ArrowRight size={18} />
                </button>
                <Link href="/register" className="zvd-secondary-button">
                  Bepul boshlash
                </Link>
              </div>

              <div className="zvd-hero-proof">
                <div className="zvd-avatar-stack" aria-hidden="true">
                  <span>ZD</span><span>01</span><span>+</span>
                </div>
                <div>
                  <strong>{stats.students > 0 ? `${formatPrice(stats.students)}+` : "Yuzlab"} o'quvchi</strong>
                  <span>allaqachon o'rganmoqda</span>
                </div>
              </div>
            </div>

            <div className="zvd-hero-showcase">
              <div className="zvd-showcase-label"><CirclePlay size={16} /> Haftaning tavsiya etilgan kursi</div>
              {featuredCourse ? (
                <Link href={`/kurs/${featuredCourse.id}`} className="zvd-featured-card">
                  <div className="zvd-featured-media">
                    {courseImage(featuredCourse) ? (
                      <img src={courseImage(featuredCourse)} alt={`${featuredCourse.title} kursi`} />
                    ) : (
                      <span className="zvd-featured-placeholder"><BookOpen size={64} /></span>
                    )}
                    <span className="zvd-featured-overlay" />
                    <span className="zvd-featured-play"><Play size={22} fill="currentColor" /></span>
                    <span className="zvd-featured-count">{featuredCourse.lessonsCount || 0} video dars</span>
                  </div>
                  <div className="zvd-featured-body">
                    <span>{featuredCourse.category || "Video qo'llanma"}</span>
                    <h2>{featuredCourse.title}</h2>
                    <p>{instructorName(featuredCourse)}</p>
                    <div>
                      <strong>{featuredCourse.isFree || Number(featuredCourse.price) === 0 ? "Bepul" : `${formatPrice(effectiveCoursePrice(featuredCourse))} so'm`}</strong>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="zvd-featured-card zvd-featured-loading" />
              )}
              <div className="zvd-floating-note zvd-note-top"><Headphones size={17} /> Istalgan joyda</div>
              <div className="zvd-floating-note zvd-note-bottom"><BadgeCheck size={17} /> Sifatli darslar</div>
            </div>
          </div>
        </section>

        <section className="zvd-stat-strip" aria-label="Platforma statistikasi">
          <div className="zvd-container zvd-stat-grid">
            <div><strong>{courses.length || "—"}</strong><span>Video kurs</span></div>
            <div><strong>{stats.lessons || "—"}</strong><span>Tizimli dars</span></div>
            <div><strong>{stats.students || "—"}+</strong><span>Faol o'quvchi</span></div>
            <div><strong>{stats.free || "—"}</strong><span>Bepul kurs</span></div>
          </div>
        </section>

        <section className="zvd-courses-section" id="kurslar">
          <div className="zvd-container">
            <div className="zvd-section-heading">
              <div>
                <span className="zvd-eyebrow">Video kutubxona</span>
                <h2>O'zingizga mos kursni tanlang</h2>
                <p>Darajangiz va maqsadingizga mos amaliy video darslar.</p>
              </div>
              <div className="zvd-search-box">
                <Search size={19} aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Kurs nomi bo'yicha qidiring"
                  aria-label="Kurslarni qidirish"
                />
              </div>
            </div>

            <div className="zvd-filter-row" aria-label="Kurs filtrlari">
              <div className="zvd-segmented-control">
                {([
                  ["all", "Barchasi"],
                  ["free", "Bepul"],
                  ["paid", "Premium"],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={filter === value ? "is-active" : ""}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {levels.length > 0 && (
                <div className="zvd-level-filters" aria-label="Darajalar">
                  <button type="button" className={!levelId ? "is-active" : ""} onClick={() => setLevelId("")}>Barcha daraja</button>
                  {levels.map((level) => (
                    <button
                      type="button"
                      key={level.id}
                      className={levelId === level.id ? "is-active" : ""}
                      onClick={() => setLevelId(level.id)}
                    >
                      {level.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoading ? (
              <CourseGridSkeleton />
            ) : isError ? (
              <div className="zvd-empty-state">
                <BookOpen size={32} />
                <h3>Kurslarni yuklab bo'lmadi</h3>
                <p>Internet aloqasini tekshirib, sahifani qayta yuklang.</p>
              </div>
            ) : filteredCourses.length ? (
              <div className="zvd-course-grid">
                {filteredCourses.map((course, index) => (
                  <PublicCourseCard key={course.id} course={course} levels={levels} priority={index < 3} />
                ))}
              </div>
            ) : (
              <div className="zvd-empty-state">
                <Search size={32} />
                <h3>Mos kurs topilmadi</h3>
                <p>Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring.</p>
                <button type="button" onClick={() => { setSearch(""); setFilter("all"); setLevelId(""); }}>Filtrlarni tozalash</button>
              </div>
            )}
          </div>
        </section>

        <section className="zvd-how-section" id="qanday-ishlaydi">
          <div className="zvd-container">
            <div className="zvd-centered-heading">
              <span className="zvd-eyebrow">Oddiy va tushunarli</span>
              <h2>O'rganishning uch qadami</h2>
              <p>Kerakli kursni toping, darslarni tartib bilan ko'ring va bilimni amalda mustahkamlang.</p>
            </div>
            <div className="zvd-how-grid">
              <article><span>01</span><div><Search size={24} /></div><h3>Kursni tanlang</h3><p>Daraja, mavzu va maqsadingiz bo'yicha mos kursni toping.</p></article>
              <article><span>02</span><div><CirclePlay size={24} /></div><h3>Video darsni ko'ring</h3><p>Darslar ketma-ketligi va demo videolar bilan tanishib boring.</p></article>
              <article><span>03</span><div><GraduationCap size={24} /></div><h3>Natijaga erishing</h3><p>Topshiriq va testlar orqali o'rganganlaringizni mustahkamlang.</p></article>
            </div>
          </div>
        </section>

        <section className="zvd-value-section" id="biz-haqimizda">
          <div className="zvd-container zvd-value-layout">
            <div className="zvd-value-panel">
              <span className="zvd-value-ring"><Star size={28} fill="currentColor" /></span>
              <div className="zvd-value-quote">
                <strong>“Har bir dars — aniq natija uchun.”</strong>
                <p>Zamonaviy ta'lim jamoasi</p>
              </div>
              <div className="zvd-mini-metrics">
                <span><strong>24/7</strong><small>kirish imkoniyati</small></span>
                <span><strong>100%</strong><small>mobil moslashuv</small></span>
              </div>
            </div>

            <div className="zvd-value-copy">
              <span className="zvd-eyebrow">Nega aynan biz?</span>
              <h2>Kitobdan videoga, videodan natijaga.</h2>
              <p>
                Murakkab qo'llanmalarni tartibli, qisqa va amaliy video darslarga aylantiramiz. Siz esa o'z vaqtingizda, istalgan qurilmada o'rganasiz.
              </p>
              <ul>
                <li><Check size={18} />Darslar kitob va qo'llanmalar asosida tizimlangan</li>
                <li><Check size={18} />Telefon, planshet va kompyuterda qulay ishlaydi</li>
                <li><Check size={18} />Bepul demo orqali kursni oldindan ko'rish mumkin</li>
                <li><Check size={18} />Progress, test va topshiriqlar bitta kabinetda</li>
              </ul>
              <div className="zvd-trust-row">
                <span><ShieldCheck size={20} />Xavfsiz to'lov</span>
                <span><Clock3 size={20} />O'z tempingizda</span>
                <span><Users size={20} />Jamoa yordami</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter settings={settings} />
    </div>
  );
}
