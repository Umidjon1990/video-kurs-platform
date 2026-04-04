import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface VideoPlaybackContextValue {
  isVideoPlaying: boolean;
  setVideoPlaying: (playing: boolean) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextValue>({
  isVideoPlaying: false,
  setVideoPlaying: () => {},
});

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const setVideoPlaying = useCallback((playing: boolean) => {
    setIsVideoPlaying(playing);
  }, []);

  return (
    <VideoPlaybackContext.Provider value={{ isVideoPlaying, setVideoPlaying }}>
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  return useContext(VideoPlaybackContext);
}
