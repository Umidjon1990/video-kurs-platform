import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Clock3, Play } from "lucide-react";
import {
  courseImage,
  effectiveCoursePrice,
  formatPrice,
  levelForCourse,
  publicCategoryLabel,
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
          <span>{level?.code || publicCategoryLabel(course.category)}</span>
          {course.discountPercentage ? <strong>−{course.discountPercentage}%</strong> : null}
        </div>
        <Link href={`/kurs/${course.id}`} className="zvd-course-title">{course.title}</Link>

        <div className="zvd-course-meta">
          <span><BookOpen size={15} />{course.lessonsCount || 0} dars</span>
          {course.subscriptionDays ? <span><Clock3 size={15} />{course.subscriptionDays} kun</span> : null}
        </div>

        <Link href={`/kurs/${course.id}`} className="zvd-course-link">
          Batafsil <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
