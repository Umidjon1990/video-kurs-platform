import type {
  Course,
  CoursePlanPricing,
  LanguageLevel,
  SiteSetting,
  SubscriptionPlan,
} from "@shared/schema";

export type PublicInstructor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export type PublicCourse = Course & {
  instructor: PublicInstructor;
  enrollmentsCount: number;
  lessonsCount: number;
  planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
  averageRating?: number;
  totalRatings?: number;
};

export type PublicLesson = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  pdfUrl?: string;
  isDemo: boolean;
  duration?: number;
  order: number;
  courseId: string;
  moduleId?: string | null;
};

export type PublicCourseModule = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
};

export type PublicLanguageLevel = Pick<
  LanguageLevel,
  "id" | "code" | "name" | "description" | "order"
>;

export function formatPrice(value: string | number | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("uz-UZ").format(amount);
}

export function effectiveCoursePrice(course: Pick<PublicCourse, "price" | "discountPercentage">) {
  const price = Number(course.price || 0);
  const discount = Number(course.discountPercentage || 0);
  return discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
}

export function instructorName(course: PublicCourse) {
  const name = [course.instructor?.firstName, course.instructor?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return course.author?.trim() || name || "Zamonaviy ta'lim jamoasi";
}

export function courseImage(course: PublicCourse) {
  const source = (course.thumbnailUrl || course.imageUrl || "").trim();
  if (!source) return "";

  if (source.includes("drive.google.com")) {
    const fileMatch = source.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idMatch = source.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = fileMatch?.[1] || idMatch?.[1];

    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return source;
}

export function publicCategoryLabel(value?: string | null) {
  const category = value?.trim();
  if (!category) return "Video kurs";

  const labels: Record<string, string> = {
    language: "Til kursi",
    speaking: "So'zlashuv",
    writing: "Yozuv",
  };

  return labels[category.toLocaleLowerCase("uz")] || category;
}

export function getSetting(
  settings: SiteSetting[] | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = settings?.find((setting) => setting.key === key)?.value?.trim();
    if (value) return value;
  }
  return "";
}

export function getVideoEmbedUrl(value?: string | null) {
  if (!value) return "";

  try {
    const raw = value.trim();
    const iframeSource = raw.match(/src=["']([^"']+)["']/i)?.[1];
    const normalized = iframeSource || raw;
    const url = new URL(normalized);
    let videoId = "";

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.replace("/embed/", "").split("/")[0] || "";
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.replace("/shorts/", "").split("/")[0] || "";
      } else {
        videoId = url.searchParams.get("v") || "";
      }
    }

    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&playsinline=1`;
    }

    const allowedEmbedHosts = [
      "player.mediadelivery.net",
      "iframe.mediadelivery.net",
      "kinescope.io",
      "player.vimeo.com",
      "drive.google.com",
    ];

    return url.protocol === "https:" && allowedEmbedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function levelForCourse(
  course: PublicCourse,
  levels: PublicLanguageLevel[] | undefined,
) {
  return levels?.find((level) => level.id === course.levelId);
}
