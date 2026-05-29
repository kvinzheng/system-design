import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onHls?: (hls: Hls | null) => void;
  poster?: string;
}

/**
 * Thin wrapper around <video> that wires up hls.js (or native HLS on Safari)
 * for adaptive bitrate playback.
 */
export const HlsVideo: React.FC<Props> = ({
  src,
  muted,
  autoPlay,
  controls,
  className,
  videoRef,
  onHls,
  poster,
}) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let hls: Hls | null = null;

    // Safari + iOS support HLS natively via the <video> element.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        // Tuning for fast startup + smooth playback
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        // Start at the lowest rendition for instant playback, then ramp up.
        startLevel: -1,
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 500_000,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      onHls?.(hls);
    } else {
      video.src = src;
    }

    return () => {
      onHls?.(null);
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      muted={muted}
      autoPlay={autoPlay}
      controls={controls}
      playsInline
      poster={poster}
      className={className}
      crossOrigin="anonymous"
    />
  );
};
