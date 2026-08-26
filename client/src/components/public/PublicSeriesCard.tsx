import { Link } from "wouter";
import { ArrowUpRight, BookOpen, FolderOpen, Layers3 } from "lucide-react";
import { courseImage, publicImageUrl, type PublicCourseSeries } from "@/lib/publicSite";

type PublicSeriesCardProps = {
  series: PublicCourseSeries;
  priority?: boolean;
};

export function PublicSeriesCard({ series, priority = false }: PublicSeriesCardProps) {
  const childImages = series.courses.map(courseImage).filter(Boolean).slice(0, 3);
  const cover = publicImageUrl(series.coverImageUrl || childImages[0]);

  return (
    <article className="zvd-series-card">
      <Link href={`/toplam/${series.slug}`} className="zvd-series-media" aria-label={`${series.title} to'plamini ochish`}>
        <span className="zvd-series-folder-tab" aria-hidden="true" />
        <span className="zvd-series-placeholder" aria-hidden="true"><Layers3 size={64} /></span>
        {cover ? (
          <img
            src={cover}
            alt={`${series.title} muqovasi`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        ) : null}
        <span className="zvd-series-shade" aria-hidden="true" />
        <span className="zvd-series-label"><FolderOpen size={14} /> Kurslar to'plami</span>
        <span className="zvd-series-count">{series.courseCount} kitob</span>
      </Link>

      <div className="zvd-series-body">
        {series.levels.length ? (
          <div className="zvd-series-levels" aria-label="To'plam darajalari">
            {series.levels.map((level) => <span key={level.id}>{level.code}</span>)}
          </div>
        ) : <span className="zvd-series-kind">Video kurslar</span>}
        <Link href={`/toplam/${series.slug}`} className="zvd-series-title">{series.title}</Link>
        {series.description ? <p>{series.description}</p> : null}
        <div className="zvd-series-meta">
          <span><BookOpen size={15} />{series.lessonsCount} dars</span>
          <Link href={`/toplam/${series.slug}`}>To'plamni ochish <ArrowUpRight size={17} /></Link>
        </div>
      </div>
    </article>
  );
}
