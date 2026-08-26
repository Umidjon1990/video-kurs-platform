import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Clock3, Play, Star, Users } from "lucide-react";
import {
  courseImage,
  effectiveCoursePrice,
  formatPrice,
  instructorName,
  levelForCourse,
  type PublicCourse,
  type PublicLanguageLevel,
} from "@/lib/publicSite";

type PublicCourseCardProps = {
  course: PublicCourse;
  levels?: PublicLanguageLevel[];
  priority?: boolean;
};

export function PublicCourseCard({ course, levels, priority = false }: PublicCourseCardProps) {
  const image = courseImage(course);
  const level = levelForCourse(course, levels);
  const isFree = course.isFree || Number(course.price) === 0;
  const hasRating = Boolean(course.totalRatings && course.totalRatings > 0);

  return (
    <article className="zvd-course-card">
      <Link href={`/kurs/${course.id}`} className="zvd-course-media" aria-label={`${course.title} kursini ko'rish`}>
        <span className="zvd-course-placeholder" aria-hidden="true"><BookOpen size={42} /></span>
        {image ? (
          <img
            src={image}
            alt={`${course.title} kursi muqovasi`}
            loading={priority ? "eager" : "lazy"}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        ) : null}
        <span className="zvd-course-scrim" />
        <span className="zvd-course-play"><Play size={18} fill="currentColor" /></span>
        <span className={`zvd-price-badge ${isFree ? "is-free" : ""}`}>
          {isFree ? "Bepul" : `${formatPrice(effectiveCoursePrice(course))} so'm`}
        </span>
      </Link>

      <div className="zvd-course-body">
        <div className="zvd-course-topline">
          <span>{level?.code || course.category || "Video kurs"}</span>
          {course.discountPercentage ? <strong>−{course.discountPercentage}%</strong> : null}
        </div>
        <Link href={`/kurs/${course.id}`} className="zvd-course-title">{course.title}</Link>
        <p className="zvd-course-author">{instructorName(course)}</p>

        <div className="zvd-course-meta">
          <span><BookOpen size={15} />{course.lessonsCount || 0} dars</span>
          <span><Users size={15} />{course.enrollmentsCount || 0} o'quvchi</span>
          {hasRating ? <span><Star size={15} fill="currentColor" />{Number(course.averageRating || 0).toFixed(1)}</span> : null}
          {!hasRating && course.subscriptionDays ? <span><Clock3 size={15} />{course.subscriptionDays} kun</span> : null}
        </div>

        <Link href={`/kurs/${course.id}`} className="zvd-course-link">
          Kursni ko'rish <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
