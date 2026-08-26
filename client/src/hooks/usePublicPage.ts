import { useEffect } from "react";

export function usePublicPage(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = descriptionTag?.content;

    document.documentElement.classList.add("public-scroll");
    document.body.classList.add("public-scroll");
    document.title = title;

    if (descriptionTag) {
      descriptionTag.content = description;
    }

    window.scrollTo({ top: 0, behavior: "auto" });

    return () => {
      document.documentElement.classList.remove("public-scroll");
      document.body.classList.remove("public-scroll");
      document.title = previousTitle;
      if (descriptionTag && previousDescription !== undefined) {
        descriptionTag.content = previousDescription;
      }
    };
  }, [description, title]);
}
