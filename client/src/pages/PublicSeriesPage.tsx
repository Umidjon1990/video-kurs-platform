import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, ChevronDown, FolderOpen, Layers3, Search } from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { PublicCourseCard } from "@/components/public/PublicCourseCard";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { usePublicPage } from "@/hooks/usePublicPage";
import { courseImage, publicImageUrl, type PublicCourse, type PublicCourseSeries, type PublicLanguageLevel } from "@/lib/publicSite";
import "@/public-site.css";

export default function PublicSeriesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [levelId, setLevelId] = useState("");
  const [search, setSearch] = useState("");

  const { data: apiSeries, isLoading: isSeriesLoading, isError: isSeriesError } = useQuery<PublicCourseSeries>({
    queryKey: [`/api/course-series/public/${slug}`],
    staleTime: 60_000,
    retry: false,
  });
  const { data: levels = [] } = useQuery<PublicLanguageLevel[]>({
    queryKey: ["/api/language-levels"],
    staleTime: 5 * 60_000,
  });
  const { data: settings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60_000,
  });
  const { data: fallbackCourses = [], isLoading: isFallbackLoading } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public"],
    staleTime: 60_000,
    enabled: isSeriesError,
  });
  const fallbackLessonQueries = useQueries({
    queries: fallbackCourses.map((course) => ({
      queryKey: [`/api/courses/${course.id}/lessons/public`],
      enabled: isSeriesError && course.lessonsCount == null,
      staleTime: 60_000,
    })),
  });
  const hydratedFallbackCourses = useMemo(
    () => fallbackCourses.map((course, index) => ({
      ...course,
      lessonsCount: course.lessonsCount ?? (Array.isArray(fallbackLessonQueries[index]?.data) ? fallbackLessonQueries[index].data.length : 0),
    })),
    [fallbackCourses, fallbackLessonQueries],
  );

  const inferredSeries = useMemo<PublicCourseSeries | undefined>(() => {
    if (!isSeriesError || slug !== "bosqichli-arab-tili-kitoblari") return undefined;
    const courses = hydratedFallbackCourses
      .filter((course) => course.title.trim().toLocaleLowerCase("uz").startsWith("bosqichli arab tili"))
      .sort((a, b) => Number(levels.find((level) => level.id === a.levelId)?.order ?? 99) - Number(levels.find((level) => level.id === b.levelId)?.order ?? 99));
    if (courses.length < 2) return undefined;
    const usedLevels = Array.from(new Set(courses.map((course) => course.levelId).filter(Boolean)))
      .map((id) => levels.find((level) => level.id === id))
      .filter(Boolean)
      .sort((a, b) => Number(a!.order || 0) - Number(b!.order || 0))
      .map((level) => ({ id: level!.id, code: level!.code, name: level!.name, order: level!.order }));
    return {
      id: "bosqichli-arab-tili-kitoblari",
      title: "Bosqichli arab tili kitoblari",
      slug: "bosqichli-arab-tili-kitoblari",
      description: "Arab tilini bosqichma-bosqich o'rganish uchun tartiblangan video kurslar.",
      coverImageUrl: courseImage(courses[0]),
      order: 0,
      courseCount: courses.length,
      lessonsCount: courses.reduce((sum, course) => sum + (course.lessonsCount || 0), 0),
      levels: usedLevels,
      courses,
    };
  }, [hydratedFallbackCourses, isSeriesError, levels, slug]);
  const series = apiSeries || inferredSeries;
  const isLoading = isSeriesLoading || (isSeriesError && isFallbackLoading);

  usePublicPage(
    series ? `${series.title} — Zamonaviy Video Darslar` : "Kurslar to'plami — Zamonaviy Video Darslar",
    series?.description?.slice(0, 155) || "Bosqichma-bosqich tartiblangan video kurslar to'plami.",
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("uz");
    return (series?.courses || []).filter((course) => {
      const matchesLevel = !levelId || course.levelId === levelId;
      const matchesSearch = !normalizedSearch || course.title.toLocaleLowerCase("uz").includes(normalizedSearch);
      return matchesLevel && matchesSearch;
    });
  }, [levelId, search, series?.courses]);

  if (isLoading) {
    return (
      <div className="zvd-site">
        <PublicSiteHeader />
        <main className="zvd-series-page-loading"><span /><span /></main>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="zvd-site">
        <PublicSiteHeader />
        <main className="zvd-not-found">
          <Layers3 size={42} />
          <h1>To'plam topilmadi</h1>
          <p>Bu to'plam o'chirilgan yoki hali nashr qilinmagan bo'lishi mumkin.</p>
          <Link href="/explore" className="zvd-primary-button"><ArrowLeft size={18} /> Kurslarga qaytish</Link>
        </main>
        <PublicSiteFooter settings={settings} />
      </div>
    );
  }

  const cover = publicImageUrl(series.coverImageUrl || courseImage(series.courses[0]));

  return (
    <div className="zvd-site">
      <PublicSiteHeader />
      <main className="zvd-series-page">
        <section className="zvd-series-hero">
          <div className="zvd-detail-grid" aria-hidden="true" />
          <div className="zvd-container">
            <Link href="/explore" className="zvd-series-back"><ArrowLeft size={16} /> Kurslarga qaytish</Link>
            <div className="zvd-series-hero-layout">
              <div className="zvd-series-hero-copy">
                <span className="zvd-series-eyebrow"><FolderOpen size={15} /> Kurslar to'plami</span>
                <h1>{series.title}</h1>
                <p>{series.description || "Bir-birini davom ettiradigan kurslarni kerakli tartibda o'rganing."}</p>
                <div className="zvd-series-summary">
                  <span><Layers3 size={18} /><strong>{series.courseCount} ta kitob</strong></span>
                  <span><BookOpen size={18} /><strong>{series.lessonsCount} ta dars</strong></span>
                </div>
                {series.levels.length ? (
                  <div className="zvd-series-path" aria-label="Darajalar ketma-ketligi">
                    {series.levels.map((level, index) => (
                      <span key={level.id}>{level.code}{index < series.levels.length - 1 ? <i aria-hidden="true">→</i> : null}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="zvd-series-cover">
                <span aria-hidden="true"><Layers3 size={76} /></span>
                {cover ? <img src={cover} alt={`${series.title} muqovasi`} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                <div><small>To'plam ichida</small><strong>{series.courseCount} ta alohida kurs</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="zvd-series-courses">
          <div className="zvd-container">
            <div className="zvd-series-courses-heading">
              <div><span className="zvd-eyebrow">Bosqichma-bosqich</span><h2>Kitobni tanlang</h2></div>
              <div className="zvd-series-tools">
                <label className="zvd-search-box">
                  <Search size={18} aria-hidden="true" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kitobni qidiring" aria-label="To'plam ichidan kurs qidirish" />
                </label>
                {series.levels.length > 1 ? (
                  <label className="zvd-level-picker">
                    <span>Daraja</span>
                    <div>
                      <select value={levelId} onChange={(event) => setLevelId(event.target.value)} aria-label="Darajani tanlash">
                        <option value="">Barcha darajalar</option>
                        {series.levels.map((level) => <option value={level.id} key={level.id}>{level.code} — {level.name}</option>)}
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </div>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="zvd-series-results"><strong>{filteredCourses.length}</strong> ta kitob</div>
            {filteredCourses.length ? (
              <div className="zvd-course-grid">
                {filteredCourses.map((course, index) => <PublicCourseCard key={course.id} course={course} levels={levels} priority={index < 3} />)}
              </div>
            ) : (
              <div className="zvd-empty-state"><Search size={30} /><h3>Mos kitob topilmadi</h3><p>Boshqa darajani tanlab ko'ring.</p></div>
            )}
          </div>
        </section>
      </main>
      <PublicSiteFooter settings={settings} />
    </div>
  );
}
