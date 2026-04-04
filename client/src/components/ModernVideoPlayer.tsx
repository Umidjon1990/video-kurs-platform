import { useState, useRef, useEffect, memo } from "react";
import { Play, Maximize2, Minimize2 } from "lucide-react";

interface ModernVideoPlayerProps {
  videoUrl: string;
  title?: string;
  paused?: boolean;
  onError?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  [key: string]: any;
}

export const ModernVideoPlayer = memo(function ModernVideoPlayer({ videoUrl, title, paused, onError, onPlayingChange }: ModernVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const isFullscreen = isNativeFullscreen || isCssFullscreen;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'string') return;
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'play' || data.event === 'playing' || data.info?.playerState === 1 || data.method === 'play') {
          onPlayingChangeRef.current?.(true);
        } else if (data.event === 'pause' || data.event === 'paused' || data.event === 'ended' || data.info?.playerState === 2 || data.info?.playerState === 0 || data.method === 'pause') {
          onPlayingChangeRef.current?.(false);
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      onPlayingChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    if (paused && iframeRef.current?.contentWindow) {
      const iframe = iframeRef.current;
      const src = iframe.src || '';
      iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      iframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
      iframe.contentWindow.postMessage(JSON.stringify({ command: 'pause' }), '*');
      if (src.includes('kinescope')) {
        iframe.contentWindow.postMessage(JSON.stringify({ type: 'player:call', data: { method: 'pause' } }), '*');
      }
      if (src.includes('mediadelivery.net')) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'pause' }), '*');
      }
      onPlayingChangeRef.current?.(false);
    }
  }, [paused]);

  useEffect(() => {
    const handleFsChange = () => {
      const inNative = !!document.fullscreenElement;
      setIsNativeFullscreen(inNative);
      if (!inNative) setIsCssFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (isCssFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCssFullscreen]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (isFullscreen) {
      if (isCssFullscreen) {
        setIsCssFullscreen(false);
      } else {
        await document.exitFullscreen?.().catch(() => {});
        (document as any).webkitExitFullscreen?.();
      }
      return;
    }

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        return;
      }
      if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
        return;
      }
    } catch (_) {}

    setIsCssFullscreen(true);
  };

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    onPlayingChangeRef.current?.(false);
  }, [videoUrl]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isLoading, videoUrl]);

  const videoContent = videoUrl?.trim() || '';

  const parseVideoUrl = (content: string): { type: string; embedUrl: string } | null => {
    if (!content) return null;

    if (content.startsWith('<iframe') || content.startsWith('<embed')) {
      const srcMatch = content.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const iframeSrc = srcMatch[1];
        if (iframeSrc.includes('youtube.com/embed/')) {
          const ytId = iframeSrc.split('youtube.com/embed/')[1]?.split(/[?&]/)[0];
          if (ytId) {
            const origin = encodeURIComponent(window.location.origin);
            return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${origin}&fs=1` };
          }
        }
        return { type: 'iframe', embedUrl: iframeSrc };
      }
      return { type: 'raw-iframe', embedUrl: content };
    }

    if (content.includes('drive.google.com')) {
      let fileId = '';
      if (content.includes('/file/d/')) {
        fileId = content.split('/file/d/')[1]?.split('/')[0];
      } else if (content.includes('id=')) {
        const idMatch = content.match(/id=([a-zA-Z0-9_-]+)/);
        fileId = idMatch ? idMatch[1] : '';
      } else if (content.includes('/d/')) {
        fileId = content.split('/d/')[1]?.split('/')[0];
      }
      if (fileId) {
        return { type: 'gdrive', embedUrl: `https://drive.google.com/file/d/${fileId}/preview` };
      }
    }

    if (content.includes('youtube.com') || content.includes('youtu.be')) {
      let videoId = '';
      if (content.includes('youtube.com/watch?v=')) {
        videoId = content.split('watch?v=')[1]?.split('&')[0];
      } else if (content.includes('youtube.com/embed/')) {
        videoId = content.split('embed/')[1]?.split('?')[0];
      } else if (content.includes('youtu.be/')) {
        videoId = content.split('youtu.be/')[1]?.split('?')[0];
      }
      if (videoId) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&fs=1` };
      }
    }

    if (content.includes('mediadelivery.net')) {
      const separator = content.includes('?') ? '&' : '?';
      const bunnyUrl = `${content}${separator}autoplay=false&preload=metadata&responsive=true`;
      return { type: 'bunny', embedUrl: bunnyUrl };
    }

    if (content.includes('kinescope.io')) {
      const separator = content.includes('?') ? '&' : '?';
      return { type: 'kinescope', embedUrl: `${content}${separator}preload=metadata&autoplay=0` };
    }

    if (content.includes('vimeo.com') ||
        content.includes('player.vimeo.com') ||
        content.includes('dailymotion.com') ||
        content.includes('wistia.com')) {
      return { type: 'other', embedUrl: content };
    }

    if (content.startsWith('http://') || content.startsWith('https://')) {
      return { type: 'direct', embedUrl: content };
    }

    return null;
  };

  const parsedVideo = parseVideoUrl(videoContent);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (!videoContent) {
    return (
      <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center text-white/70">
          <Play className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Video URL kiritilmagan</p>
        </div>
      </div>
    );
  }

  if (!parsedVideo) {
    return (
      <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center p-6">
        <div className="text-center text-white">
          <p className="mb-4 text-white/70">Video formatini aniqlab bo'lmadi</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all text-sm"
          >
            {videoUrl}
          </a>
        </div>
      </div>
    );
  }

  if (parsedVideo.type === 'raw-iframe') {
    const mobileFixedHtml = parsedVideo.embedUrl
      .replace(/<iframe/gi, '<iframe playsinline webkit-playsinline')
      .replace(/(<iframe[^>]*?)(?:\s*\/?>)/gi, (match, p1) => {
        if (!match.includes('allow=')) {
          return p1 + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"' + (match.endsWith('/>') ? ' />' : '>');
        }
        return match;
      });
    return (
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: mobileFixedHtml }}
          data-testid="video-player-raw-iframe"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${isCssFullscreen ? 'rounded-none' : 'aspect-video rounded-xl overflow-hidden'}`}
      style={isCssFullscreen ? {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        overflow: 'hidden',
      } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black pointer-events-none">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Play className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="mt-3 text-sm text-white/60">Video yuklanmoqda...</p>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <p className="text-lg mb-2">Video yuklanmadi</p>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              Havolani ochish
            </a>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={parsedVideo.embedUrl}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        playsInline
        {...{ 'webkit-playsinline': '' } as any}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        data-testid="modern-video-player"
      />

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Kichraytirish" : "To'liq ekran"}
        className={`absolute z-30 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 text-white text-xs font-medium border border-white/20 transition-opacity duration-200 opacity-0 hover:opacity-100 focus:opacity-100 ${
          isFullscreen
            ? "top-4 right-4 opacity-100"
            : "bottom-3 right-3"
        }`}
        style={{ willChange: 'opacity' }}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
        <span>{isFullscreen ? "Yopish" : "Kattalashtirish"}</span>
      </button>

    </div>
  );
});

export function VideoPlayerSkeleton() {
  return (
    <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden animate-pulse">
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-white/10 mx-auto mb-4" />
          <div className="h-4 w-32 bg-white/10 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
