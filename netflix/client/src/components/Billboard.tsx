import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Video } from '../types';
import { HlsVideo } from './HlsVideo';

interface Props {
  video: Video;
}

export const Billboard: React.FC<Props> = ({ video }) => {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  // Defer video mount slightly so the hero image renders first (faster LCP).
  useEffect(() => {
    const t = setTimeout(() => setShowVideo(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="billboard">
      <div
        className="billboard-img"
        style={{ backgroundImage: `url(${video.backdropUrl})` }}
      />
      {showVideo && (
        <HlsVideo src={video.hlsUrl} muted={muted} autoPlay controls={false} />
      )}
      <div className="fade" />
      <div className="billboard-content">
        <h1>{video.title}</h1>
        <p>{video.synopsis}</p>
        <div className="billboard-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/watch/${video.id}`)}
          >
            ▶ Play
          </button>
          <button className="btn btn-ghost">ⓘ More Info</button>
        </div>
      </div>
      <button
        className="mute-toggle"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};
