import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UrgentAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
}

export function UrgentBanner() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: urgentAnnouncements = [] } = useQuery<UrgentAnnouncement[]>({
    queryKey: ["/api/announcements/urgent"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const visible = urgentAnnouncements.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="shrink-0">
      <AnimatePresence>
        {visible.map((a) => (
          <motion.div
            key={a.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            data-testid={`urgent-banner-${a.id}`}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                background: "linear-gradient(90deg, rgba(220,38,38,0.15) 0%, rgba(234,88,12,0.1) 50%, rgba(220,38,38,0.15) 100%)",
                borderBottom: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <div className="flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Muhim</span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold text-red-200 truncate">{a.title}</span>
                <span className="text-xs text-red-300/60 hidden sm:inline truncate">{a.message}</span>
              </div>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(a.id))}
                className="shrink-0 p-1 rounded-lg text-red-400/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                data-testid={`button-dismiss-urgent-${a.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
