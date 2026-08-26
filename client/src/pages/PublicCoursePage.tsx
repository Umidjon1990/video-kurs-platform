import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  GraduationCap,
  Lock,
  Play,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { SiteSetting } from "@shared/schema";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { usePublicPage } from "@/hooks/usePublicPage";
import {
  courseImage,
  effectiveCoursePrice,
  formatPrice,
  getVideoEmbedUrl,
  instructorName,
  levelForCourse,
  type PublicCourse,
  type PublicCourseModule,
  type PublicLanguageLevel,
  type PublicLesson,
} from "@/lib/publicSite";
import "@/public-site.css";

function CoursePageLoading() {
  return (
    <div className="zvd-course-page-loading">
      <div className="zvd-container">
        <span /><div><i /><i /><i /></div>
      </div>
    </div>
  );
}

export default function PublicCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: courses = [], isLoading: isCoursesLoading } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public"],
    staleTime: 60_000,
  });
  const { data: levels = [] } = useQuery<PublicLanguageLevel[]>({
    queryKey: ["/api/language-levels"],
    staleTime: 5 * 60_000,
  });
  const { data: settings } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60_000,
  });

  const course = courses.find((item) => item.id === courseId);
  const { data: lessons = [], isLoading: isLessonsLoading } = useQuery<PublicLesson[]>({
    queryKey: [`/api/courses/${courseId}/lessons/public`],
    enabled: Boolean(courseId && course),
    staleTime: 60_000,
  });
  const { data: modules = [] } = useQuery<PublicCourseModule[]>({
    queryKey: [`/api/courses/${courseId}/modules/public`],
    enabled: Boolean(courseId && course),
    staleTime: 60_000,
  });

  const demoLessons = useMemo(
    () => lessons.filter((lesson) => lesson.isDemo && lesson.videoUrl).sort((a, b) => a.order - b.order),
    [lessons],
  );
  const level = course ? levelForCourse(course, levels) : undefined;
  const isFree = Boolean(course?.isFree) || Number(course?.price || 0) === 0;
  const totalDuration = lessons.reduce((sum, lesson) => sum + Number(lesson.duration || 0), 0);

  usePublicPage(
    course ? `${course.title} — Zamonaviy Video Darslar` : "Kurs — Zamonaviy Video Darslar",
    course?.description?.slice(0, 155) || "Video kurs tafsilotlari, darslar dasturi va bepul demo darslar.",
  );

  useEffect(() => {
    if (!course) return;
    const previewCandidates = [course.promoVideoUrl, ...demoLessons.map((lesson) => lesson.videoUrl)].filter(Boolean) as string[];
    const firstPreview = previewCandidates.find((value) => getVideoEmbedUrl(value)) || previewCandidates[0] || "";
    setPreviewUrl(firstPreview);
  }, [course, demoLessons]);

  const moduleGroups = useMemo(() => {
    const orderedModules = [...modules].sort((a, b) => a.order - b.order);
    const groups = orderedModules.map((module) => ({
      module,
      lessons: lessons.filter((lesson) => lesson.moduleId === module.id).sort((a, b) => a.order - b.order),
    }));
    const standalone = lessons.filter((lesson) => !lesson.moduleId).sort((a, b) => a.order - b.order);
    if (standalone.length) {
      groups.push({
        module: { id: "standalone", courseId: courseId || "", title: "Qo'shimcha darslar", description: null, order: 999 },
        lessons: standalone,
      });
    }
    return groups;
  }, [courseId, lessons, modules]);

  const selectPreview = (lesson: PublicLesson) => {
    setPreviewUrl(lesson.videoUrl);
    window.setTimeout(() => document.getElementById("video-preview")?.scrollIntoView({ behavior: "smooth", block: "center" }), 20);
  };

  const shareCourse = async () => {
    const shareData = { title: course?.title || "Zamonaviy Video Darslar", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // The user can cancel the native share sheet without an error message.
    }
  };

  if (isCoursesLoading) {
    return <div className="zvd-site"><PublicSiteHeader /><CoursePageLoading /></div>;
  }

  if (!course) {
    return (
      <div className="zvd-site">
        <PublicSiteHeader />
        <main className="zvd-not-found">
          <BookOpen size={42} />
          <h1>Kurs topilmadi</h1>
          <p>Bu kurs o'chirilgan yoki ommaga ochilmagan bo'lishi mumkin.</p>
          <Link href="/explore" className="zvd-primary-button"><ArrowLeft size={18} /> Kurslarga qaytish</Link>
        </main>
        <PublicSiteFooter settings={settings} />
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(previewUrl);
  const checkoutHref = isFree ? `/register?course=${course.id}` : `/checkout/${course.id}`;

  return (
    <div className="zvd-site">
      <PublicSiteHeader />

      <main className="zvd-detail-page">
        <section className="zvd-detail-hero">
          <div className="zvd-detail-grid" aria-hidden="true" />
          <div className="zvd-container">
            <div className="zvd-breadcrumbs">
              <Link href="/">Bosh sahifa</Link><span>/</span><Link href="/explore">Kurslar</Link><span>/</span><strong>{course.title}</strong>
            </div>

            <div className="zvd-detail-layout">
              <div className="zvd-detail-copy">
                <div className="zvd-detail-badges">
                  <span>{level?.code || course.category || "Video kurs"}</span>
                  {isFree ? <span className="is-free">Bepul kurs</span> : null}
                  {course.discountPercentage ? <span className="is-discount">−{course.discountPercentage}%</span> : null}
                </div>
                <h1>{course.title}</h1>
                <p>{course.description || "Tizimli video darslar orqali mavzuni bosqichma-bosqich o'rganing."}</p>

                <div className="zvd-detail-author">
                  <span className="zvd-instructor-avatar">
                    {course.instructor.profileImageUrl ? <img src={course.instructor.profileImageUrl} alt="" /> : <GraduationCap size={21} />}
                  </span>
                  <div><small>Kurs muallifi</small><strong>{instructorName(course)}</strong></div>
                </div>

                <div className="zvd-detail-metrics">
                  <span><BookOpen size={19} /><strong>{course.lessonsCount || lessons.length}</strong><small>video dars</small></span>
                  <span><Clock3 size={19} /><strong>{totalDuration || course.subscriptionDays || 0}</strong><small>{totalDuration ? "daqiqa" : "kun kirish"}</small></span>
                  <span><Users size={19} /><strong>{course.enrollmentsCount || 0}</strong><small>o'quvchi</small></span>
                  {course.totalRatings ? <span><Star size={19} fill="currentColor" /><strong>{Number(course.averageRating || 0).toFixed(1)}</strong><small>{course.totalRatings} baho</small></span> : null}
                </div>
              </div>

              <aside className="zvd-enroll-card">
                <div className="zvd-enroll-media">
                  <span aria-hidden="true"><BookOpen size={56} /></span>
                  {courseImage(course) ? (
                    <img
                      src={courseImage(course)}
                      alt={`${course.title} kursi muqovasi`}
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                  {previewUrl && <button type="button" onClick={() => document.getElementById("video-preview")?.scrollIntoView({ behavior: "smooth" })} aria-label="Kurs videosini ko'rish"><Play size={23} fill="currentColor" /></button>}
                </div>
                <div className="zvd-enroll-body">
                  {course.discountPercentage && !isFree ? <del>{formatPrice(course.price)} so'm</del> : null}
                  <strong>{isFree ? "Bepul" : `${formatPrice(effectiveCoursePrice(course))} so'm`}</strong>
                  <p>{isFree ? "Ro'yxatdan o'ting va darslarni boshlang" : `${course.subscriptionDays || 30} kunlik to'liq kirish`}</p>
                  <Link href={checkoutHref} className="zvd-primary-button">{isFree ? "Bepul boshlash" : "Kursga yozilish"}</Link>
                  <button type="button" className="zvd-share-button" onClick={shareCourse}><Share2 size={17} />{copied ? "Havola nusxalandi" : "Kursni ulashish"}</button>
                  <ul>
                    <li><Check size={16} />Barcha video darslar</li>
                    <li><Check size={16} />Topshiriq va testlar</li>
                    <li><Check size={16} />Mobil va kompyuterda kirish</li>
                  </ul>
                  <span className="zvd-secure-note"><ShieldCheck size={16} />Xavfsiz va himoyalangan kirish</span>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="zvd-detail-content">
          <div className="zvd-container zvd-detail-content-grid">
            <div>
              <section className="zvd-preview-section" id="video-preview">
                <div className="zvd-content-heading">
                  <span className="zvd-eyebrow">Kurs bilan tanishing</span>
                  <h2>Video preview</h2>
                </div>
                <div className="zvd-video-shell">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={`${course.title} video preview`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <div className="zvd-video-fallback">
                      <Play size={42} />
                      <strong>Preview tez orada qo'shiladi</strong>
                      <span>Kurs dasturi bilan quyida tanishing.</span>
                    </div>
                  )}
                </div>
                {demoLessons.length > 1 && (
                  <div className="zvd-demo-chips" aria-label="Bepul demo darslar">
                    {demoLessons.map((lesson, index) => (
                      <button type="button" key={lesson.id} onClick={() => selectPreview(lesson)} className={lesson.videoUrl === previewUrl ? "is-active" : ""}>
                        <Play size={14} fill="currentColor" /> Demo {index + 1}: {lesson.title}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="zvd-curriculum-section">
                <div className="zvd-content-heading zvd-curriculum-heading">
                  <div><span className="zvd-eyebrow">Kurs dasturi</span><h2>Darslar va modullar</h2></div>
                  <span>{modules.length || 1} modul · {lessons.length} dars</span>
                </div>

                {isLessonsLoading ? (
                  <div className="zvd-curriculum-loading"><span /><span /><span /></div>
                ) : moduleGroups.length ? (
                  <div className="zvd-curriculum-list">
                    {moduleGroups.map((group, groupIndex) => (
                      <details key={group.module.id} open={groupIndex === 0}>
                        <summary>
                          <span><small>{String(groupIndex + 1).padStart(2, "0")}</small><strong>{group.module.title}</strong></span>
                          <span>{group.lessons.length} dars <ChevronDown size={18} /></span>
                        </summary>
                        <div className="zvd-lesson-list">
                          {group.lessons.map((lesson, index) => (
                            <div key={lesson.id} className="zvd-lesson-row">
                              <span className="zvd-lesson-index">{String(index + 1).padStart(2, "0")}</span>
                              <div><strong>{lesson.title}</strong>{lesson.description ? <small>{lesson.description}</small> : null}</div>
                              <span className="zvd-lesson-duration">{lesson.duration ? `${lesson.duration} daq` : <FileText size={16} />}</span>
                              {lesson.isDemo && lesson.videoUrl ? (
                                <button type="button" onClick={() => selectPreview(lesson)}><Play size={15} fill="currentColor" /> Demo</button>
                              ) : (
                                <span className="zvd-locked-label"><Lock size={14} /> Yopiq</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="zvd-empty-state"><CalendarDays size={30} /><h3>Darslar dasturi tayyorlanmoqda</h3></div>
                )}
              </section>
            </div>

            <aside className="zvd-detail-side-info">
              <div><h3>Kurs haqida</h3><p>{course.description || "Bosqichma-bosqich o'rganishga mo'ljallangan amaliy video kurs."}</p></div>
              <div><h3>Sizga nima beradi?</h3><ul><li><Check size={16} />Tartibli o'quv yo'li</li><li><Check size={16} />Istalgan joyda o'rganish</li><li><Check size={16} />Amaliy bilim va ko'nikma</li></ul></div>
              {level && <div><h3>Daraja</h3><p><strong>{level.code} — {level.name}</strong><br />{level.description}</p></div>}
            </aside>
          </div>
        </section>

        <div className="zvd-mobile-enroll-bar">
          <div><small>Kurs narxi</small><strong>{isFree ? "Bepul" : `${formatPrice(effectiveCoursePrice(course))} so'm`}</strong></div>
          <Link href={checkoutHref}>{isFree ? "Boshlash" : "Yozilish"}</Link>
        </div>
      </main>

      <PublicSiteFooter settings={settings} />
    </div>
  );
}
