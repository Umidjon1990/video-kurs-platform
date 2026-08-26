import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { PublicCourseCard } from "@/components/public/PublicCourseCard";
import { PublicSeriesCard } from "@/components/public/PublicSeriesCard";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { usePublicPage } from "@/hooks/usePublicPage";
import {
  courseImage,
  effectiveCoursePrice,
  formatPrice,
  instructorName,
  publicCategoryLabel,
  type PublicCourse,
  type PublicCourseSeries,
  type PublicLanguageLevel,
} from "@/lib/publicSite";
import "@/public-site.css";

type CourseFilter = "all" | "free" | "paid";

function useCommunityCount() {
  const [count, setCount] = useState(960);

  useEffect(() => {
    const target = 1000;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setCount(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 1200;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(960 + (target - 960) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return count;
}

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
  const communityCount = useCommunityCount();

  usePublicPage(
    "Zamonaviy Video Darslar — Bilimni videoda o'rganing",
    "O'zbek tilidagi tartibli video darslar va amaliy qo'llanmalar. O'zingizga mos kursni tanlang.",
  );

  const { data: courses = [], isLoading: isCoursesLoading, isError: isCoursesError } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public"],
    staleTime: 60_000,
  });
  const {
    data: publishedSeries = [],
    isLoading: isSeriesLoading,
    isError: isSeriesError,
  } = useQuery<PublicCourseSeries[]>({
    queryKey: ["/api/course-series/public"],
    staleTime: 60_000,
    retry: false,
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
    if (location === "/explore" && !isCoursesLoading) {
      window.setTimeout(() => {
        document.getElementById("kurslar")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [isCoursesLoading, location]);

  const featuredCourse = useMemo(
    () => catalogueCourses.find((course) => !course.isFree && Number(course.price) > 0) || catalogueCourses[0],
    [catalogueCourses],
  );

  const availableLevels = useMemo(() => {
    const usedLevelIds = new Set(catalogueCourses.map((course) => course.levelId).filter(Boolean));
    return [...levels]
      .filter((level) => usedLevelIds.has(level.id))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [catalogueCourses, levels]);

  const catalogueSeries = useMemo<PublicCourseSeries[]>(() => {
    if (!isSeriesError) return publishedSeries;
    const inferredCourses = catalogueCourses
      .filter((course) => course.title.trim().toLocaleLowerCase("uz").startsWith("bosqichli arab tili"))
      .sort((a, b) => {
        const aLevel = levels.find((level) => level.id === a.levelId)?.order ?? 99;
        const bLevel = levels.find((level) => level.id === b.levelId)?.order ?? 99;
        return Number(aLevel) - Number(bLevel);
      });
    if (inferredCourses.length < 2) return [];
    const inferredLevels = Array.from(new Set(inferredCourses.map((course) => course.levelId).filter(Boolean)))
      .map((id) => levels.find((level) => level.id === id))
      .filter(Boolean)
      .sort((a, b) => Number(a!.order || 0) - Number(b!.order || 0))
      .map((level) => ({ id: level!.id, code: level!.code, name: level!.name, order: level!.order }));
    return [{
      id: "bosqichli-arab-tili-kitoblari",
      title: "Bosqichli arab tili kitoblari",
      slug: "bosqichli-arab-tili-kitoblari",
      description: "Arab tilini bosqichma-bosqich o'rganish uchun tartiblangan video kurslar.",
      coverImageUrl: courseImage(inferredCourses[0]),
      order: 0,
      courseCount: inferredCourses.length,
      lessonsCount: inferredCourses.reduce((sum, course) => sum + (course.lessonsCount || 0), 0),
      levels: inferredLevels,
      courses: inferredCourses,
    }];
  }, [catalogueCourses, isSeriesError, levels, publishedSeries]);

  const groupedCourseIds = useMemo(
    () => new Set(catalogueSeries.flatMap((series) => series.courses.map((course) => course.id))),
    [catalogueSeries],
  );

  const standaloneCourses = useMemo(
    () => catalogueCourses.filter((course) => !groupedCourseIds.has(course.id)),
    [catalogueCourses, groupedCourseIds],
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("uz");
    return standaloneCourses.filter((course) => {
      const isFree = Boolean(course.isFree) || Number(course.price) === 0;
      const matchesFilter = filter === "all" || (filter === "free" ? isFree : !isFree);
      const matchesLevel = !levelId || course.levelId === levelId;
      const matchesSearch = !normalizedSearch || [course.title, course.description, course.author, course.category]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("uz").includes(normalizedSearch));
      return matchesFilter && matchesLevel && matchesSearch;
    });
  }, [filter, levelId, search, standaloneCourses]);

  const filteredSeries = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("uz");
    return catalogueSeries.filter((series) => {
      const matchesFilter = filter === "all" || series.courses.some((course) => {
        const isFree = Boolean(course.isFree) || Number(course.price) === 0;
        return filter === "free" ? isFree : !isFree;
      });
      const matchesLevel = !levelId || series.courses.some((course) => course.levelId === levelId);
      const matchesSearch = !normalizedSearch || [series.title, series.description, ...series.courses.map((course) => course.title)]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("uz").includes(normalizedSearch));
      return matchesFilter && matchesLevel && matchesSearch;
    });
  }, [catalogueSeries, filter, levelId, search]);

  const realLessonCount = useMemo(
    () => catalogueCourses.reduce((sum, course) => sum + (course.lessonsCount || 0), 0),
    [catalogueCourses],
  );

  const hasActiveFilters = Boolean(search || levelId || filter !== "all");
  const resultCount = filteredSeries.length + filteredCourses.length;
  const isLoading = isCoursesLoading || (isSeriesLoading && !isSeriesError);
  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setLevelId("");
  };
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
                <Sparkles size={16} /> O'zbek tilidagi video kurslar
              </div>
              <h1>
                Bilimni videoda{" "}
                <span>oson o'rganing.</span>
              </h1>
              <p>Kitob va qo'llanmalar asosidagi tartibli darslar — telefon va kompyuterda.</p>

              <div className="zvd-hero-actions">
                <button type="button" className="zvd-primary-button" onClick={jumpToCourses}>
                  Kurslarni ko'rish <ArrowRight size={18} />
                </button>
              </div>

              <div className="zvd-hero-metrics">
                <div aria-label="Mingdan ortiq ta'lim hamjamiyati">
                  <strong aria-hidden="true">{formatPrice(communityCount)}+</strong>
                  <span>ta'lim hamjamiyati</span>
                </div>
                <div aria-label={`${realLessonCount || 0} ta real video dars`}>
                  <strong>{realLessonCount || "—"}</strong>
                  <span>real video dars</span>
                </div>
              </div>
            </div>

            <div className="zvd-hero-showcase">
              <div className="zvd-showcase-label"><CirclePlay size={16} /> Tavsiya etilgan kurs</div>
              {featuredCourse ? (
                <Link href={`/kurs/${featuredCourse.id}`} className="zvd-featured-card">
                  <div className="zvd-featured-media">
                    <span className="zvd-featured-placeholder" aria-hidden="true"><BookOpen size={64} /></span>
                    {courseImage(featuredCourse) ? (
                      <img
                        src={courseImage(featuredCourse)}
                        alt={`${featuredCourse.title} kursi`}
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                    <span className="zvd-featured-overlay" />
                    <span className="zvd-featured-play"><Play size={22} fill="currentColor" /></span>
                    <span className="zvd-featured-count">{featuredCourse.lessonsCount || 0} dars</span>
                  </div>
                  <div className="zvd-featured-body">
                    <span>{publicCategoryLabel(featuredCourse.category)}</span>
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
            </div>
          </div>
        </section>

        <section className="zvd-courses-section" id="kurslar">
          <div className="zvd-container">
            <div className="zvd-section-heading">
              <div>
                <span className="zvd-eyebrow">Kurslar</span>
                <h2>O'zingizga mosini toping</h2>
              </div>
              <div className="zvd-search-box">
                <Search size={19} aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Kursni qidiring"
                  aria-label="Kurslarni qidirish"
                />
              </div>
            </div>

            <div className="zvd-filter-row" aria-label="Kurs filtrlari">
              <div className="zvd-segmented-control" aria-label="Kurs turi">
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

              {availableLevels.length > 0 && (
                <label className="zvd-level-picker">
                  <span>Daraja</span>
                  <div>
                    <select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
                      <option value="">Barcha darajalar</option>
                      {availableLevels.map((level) => (
                        <option value={level.id} key={level.id}>
                          {level.code}{level.name ? ` — ${level.name}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={17} aria-hidden="true" />
                  </div>
                </label>
              )}
            </div>

            <div className="zvd-results-summary" aria-live="polite">
              <span><strong>{isLoading ? "—" : resultCount}</strong> ta natija</span>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters}>
                  <RotateCcw size={15} /> Tozalash
                </button>
              )}
            </div>

            {isLoading ? (
              <CourseGridSkeleton />
            ) : isCoursesError ? (
              <div className="zvd-empty-state">
                <BookOpen size={32} />
                <h3>Kurslar yuklanmadi</h3>
                <p>Sahifani qayta yuklab ko'ring.</p>
              </div>
            ) : resultCount ? (
              <div className="zvd-course-grid">
                {filteredSeries.map((series, index) => (
                  <PublicSeriesCard key={series.id} series={series} priority={index < 2} />
                ))}
                {filteredCourses.map((course, index) => (
                  <PublicCourseCard key={course.id} course={course} levels={levels} priority={index + filteredSeries.length < 3} />
                ))}
              </div>
            ) : (
              <div className="zvd-empty-state">
                <Search size={32} />
                <h3>Mos kurs topilmadi</h3>
                <p>Boshqa daraja yoki qidiruvni sinab ko'ring.</p>
                <button type="button" onClick={clearFilters}>Filtrlarni tozalash</button>
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicSiteFooter settings={settings} />
    </div>
  );
}
