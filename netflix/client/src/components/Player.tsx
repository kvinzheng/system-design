import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Hls, { type Level, type LevelSwitchedData } from 'hls.js';
import type { Video } from '../types';
import { HlsVideo } from './HlsVideo';

interface Props {
  video: Video;
  onExit: () => void;
}

const fmt = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

type MenuKind = null | 'speed' | 'quality' | 'audio' | 'subs';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const Player: React.FC<Props> = ({ video, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [idle, setIdle] = useState(false);

  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto

  const [subLang, setSubLang] = useState<string | null>(null);
  const [audioLang, setAudioLang] = useState(video.audioTracks[0]?.lang ?? 'en');

  const [menu, setMenu] = useState<MenuKind>(null);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  // ------------------------------------------------------------------ HLS
  const onHls = useCallback((hls: Hls | null) => {
    hlsRef.current = hls;
    if (!hls) return;
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setLevels(hls.levels ?? []);
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_e: string, data: LevelSwitchedData) => {
      // For the "Auto" UI badge.
      if (hls.autoLevelEnabled) setCurrentLevel(-1);
      else setCurrentLevel(data.level);
    });
  }, []);

  // ------------------------------------------------------------- <video> events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onMeta = () => setDuration(v.duration);
    const onVol = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('progress', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('durationchange', onMeta);
    v.addEventListener('volumechange', onVol);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('progress', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('durationchange', onMeta);
      v.removeEventListener('volumechange', onVol);
    };
  }, []);

  // ------------------------------------------------------------- Auto-hide UI
  useEffect(() => {
    let timer: number;
    const arm = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (playing && !menu) setIdle(true);
      }, 2500);
    };
    arm();
    const el = containerRef.current;
    el?.addEventListener('mousemove', arm);
    el?.addEventListener('mouseleave', arm);
    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener('mousemove', arm);
      el?.removeEventListener('mouseleave', arm);
    };
  }, [playing, menu]);

  // ------------------------------------------------------------- Subtitle <track> wiring
  // We add <track> elements dynamically using the textTracks API so that
  // switching subtitle language only flips the showing mode.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Remove old programmatic tracks
    while (v.firstChild) v.removeChild(v.firstChild);
    video.subtitles.forEach((s) => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = s.label;
      track.srclang = s.lang;
      track.src = s.src ?? '';
      v.appendChild(track);
    });
  }, [video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      const t = v.textTracks[i];
      t.mode = t.language === subLang ? 'showing' : 'disabled';
    }
  }, [subLang, video]);

  // ------------------------------------------------------------- Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          seekBy(-10);
          break;
        case 'arrowright':
          seekBy(10);
          break;
        case 'arrowup':
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'escape':
          if (!document.fullscreenElement) onExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------- Commands
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };
  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(duration || t, t));
  };
  const seekBy = (delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta);
  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    if (val > 0) v.muted = false;
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };
  const changeRate = (r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setRate(r);
  };
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreen(false);
    } else {
      await el.requestFullscreen();
      setFullscreen(true);
    }
  };
  const pickLevel = (lvl: number) => {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = lvl; // -1 enables auto
    setCurrentLevel(lvl);
  };

  // ------------------------------------------------------------- Seekbar interactions
  const seekbarRef = useRef<HTMLDivElement>(null);
  const onSeekClick = (e: React.MouseEvent) => {
    const rect = seekbarRef.current!.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * (duration || 0));
  };
  const onSeekHover = (e: React.MouseEvent) => {
    const rect = seekbarRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHover({ x, t: (x / rect.width) * (duration || 0) });
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  // Convenience derived list of qualities (highest → lowest, plus Auto)
  const qualityOptions = useMemo(() => {
    const opts = levels
      .map((l, i) => ({ idx: i, height: l.height, bitrate: l.bitrate }))
      .sort((a, b) => b.height - a.height);
    return opts;
  }, [levels]);

  return (
    <div
      ref={containerRef}
      className={`player ${idle ? 'idle' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) togglePlay();
      }}
    >
      <HlsVideo
        src={video.hlsUrl}
        autoPlay
        videoRef={videoRef}
        onHls={onHls}
        poster={video.backdropUrl}
      />

      {/* Top bar */}
      <div className="top-bar">
        <button className="icon-btn" onClick={onExit} aria-label="Back">
          ←
        </button>
        <div className="title">{video.title}</div>
      </div>

      {/* Controls */}
      <div className="controls" onClick={(e) => e.stopPropagation()}>
        {/* Seekbar */}
        <div
          ref={seekbarRef}
          className="seekbar"
          onClick={onSeekClick}
          onMouseMove={onSeekHover}
          onMouseLeave={() => setHover(null)}
        >
          <div className="track" />
          <div className="buffered" style={{ width: `${bufferedPct}%` }} />
          <div className="progress" style={{ width: `${progressPct}%` }} />
          <div className="thumb" style={{ left: `${progressPct}%` }} />
          {hover && (
            <div className="hover-time" style={{ left: hover.x }}>
              {fmt(hover.t)}
            </div>
          )}
        </div>

        <div className="controls-row">
          <button className="icon-btn" onClick={togglePlay} aria-label="Play/pause">
            {playing ? '⏸' : '▶'}
          </button>
          <button className="icon-btn" onClick={() => seekBy(-10)} aria-label="Back 10s">
            ⏪
          </button>
          <button className="icon-btn" onClick={() => seekBy(10)} aria-label="Forward 10s">
            ⏩
          </button>

          {/* Volume */}
          <div className="volume">
            <button
              className="icon-btn"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
            />
          </div>

          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <div className="spacer" />

          {/* Speed menu */}
          <MenuButton
            label="⚡"
            title={`${rate}x`}
            open={menu === 'speed'}
            onToggle={() => setMenu(menu === 'speed' ? null : 'speed')}
          >
            <div className="menu-title">Playback speed</div>
            {PLAYBACK_RATES.map((r) => (
              <button
                key={r}
                className={`menu-item ${r === rate ? 'active' : ''}`}
                onClick={() => {
                  changeRate(r);
                  setMenu(null);
                }}
              >
                {r === 1 ? 'Normal' : `${r}x`}
              </button>
            ))}
          </MenuButton>

          {/* Audio menu */}
          {video.audioTracks.length > 1 && (
            <MenuButton
              label="🎙"
              open={menu === 'audio'}
              onToggle={() => setMenu(menu === 'audio' ? null : 'audio')}
            >
              <div className="menu-title">Audio</div>
              {video.audioTracks.map((a) => (
                <button
                  key={a.lang}
                  className={`menu-item ${a.lang === audioLang ? 'active' : ''}`}
                  onClick={() => {
                    setAudioLang(a.lang);
                    setMenu(null);
                    // In real HLS streams with alternate audio renditions we'd call:
                    // hlsRef.current!.audioTrack = idx;
                  }}
                >
                  {a.label}
                </button>
              ))}
            </MenuButton>
          )}

          {/* Subtitle menu */}
          {video.subtitles.length > 0 && (
            <MenuButton
              label="CC"
              open={menu === 'subs'}
              onToggle={() => setMenu(menu === 'subs' ? null : 'subs')}
            >
              <div className="menu-title">Subtitles</div>
              <button
                className={`menu-item ${subLang === null ? 'active' : ''}`}
                onClick={() => {
                  setSubLang(null);
                  setMenu(null);
                }}
              >
                Off
              </button>
              <hr />
              {video.subtitles.map((s) => (
                <button
                  key={s.lang}
                  className={`menu-item ${s.lang === subLang ? 'active' : ''}`}
                  onClick={() => {
                    setSubLang(s.lang);
                    setMenu(null);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </MenuButton>
          )}

          {/* Quality menu */}
          {qualityOptions.length > 0 && (
            <MenuButton
              label="⚙"
              title={
                currentLevel === -1
                  ? 'Auto'
                  : `${levels[currentLevel]?.height ?? ''}p`
              }
              open={menu === 'quality'}
              onToggle={() => setMenu(menu === 'quality' ? null : 'quality')}
            >
              <div className="menu-title">Quality</div>
              <button
                className={`menu-item ${currentLevel === -1 ? 'active' : ''}`}
                onClick={() => {
                  pickLevel(-1);
                  setMenu(null);
                }}
              >
                Auto
              </button>
              <hr />
              {qualityOptions.map((q) => (
                <button
                  key={q.idx}
                  className={`menu-item ${q.idx === currentLevel ? 'active' : ''}`}
                  onClick={() => {
                    pickLevel(q.idx);
                    setMenu(null);
                  }}
                >
                  {q.height}p
                  <span style={{ marginLeft: 'auto', color: '#888', fontSize: 12 }}>
                    {Math.round(q.bitrate / 1000)} kbps
                  </span>
                </button>
              ))}
            </MenuButton>
          )}

          <button
            className="icon-btn"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            {fullscreen ? '🗗' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
const MenuButton: React.FC<{
  label: string;
  title?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ label, title, open, onToggle, children }) => (
  <div className="menu-wrap">
    <button className="icon-btn" onClick={onToggle} aria-haspopup="menu" aria-expanded={open}>
      {label}
      {title && <span style={{ marginLeft: 4, fontSize: 12 }}>{title}</span>}
    </button>
    {open && <div className="menu" role="menu">{children}</div>}
  </div>
);
