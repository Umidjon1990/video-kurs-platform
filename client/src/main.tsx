import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

try {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(<App />);
  }
} catch (err) {
  console.error("[App Init Error]", err);
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif">
      <h2>Ilovani yuklashda xatolik</h2>
      <p style="color:#9ca3af">Sahifani qayta yuklang</p>
      <pre style="text-align:left;max-width:600px;margin:20px auto;padding:16px;background:#1f2937;border-radius:8px;overflow:auto;font-size:12px;color:#f87171">${err}</pre>
      <button onclick="location.reload(true)" style="padding:8px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer">Qayta yuklash</button>
    </div>`;
  }
}
