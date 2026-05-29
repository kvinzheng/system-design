import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Video } from '../types';
import { Player } from '../components/Player';

export const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .video(id)
      .then(setVideo)
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="loading">{error}</div>;
  if (!video)
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="watch">
      <Player video={video} onExit={() => navigate('/')} />
    </div>
  );
};
