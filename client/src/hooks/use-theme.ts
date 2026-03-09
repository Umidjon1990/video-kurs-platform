import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  const toggleTheme = () => {};
  const setTheme = () => {};

  return { theme, setTheme, toggleTheme };
}
