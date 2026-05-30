import { usePlayerStore } from '../player/playerStore';
import { QueueManager } from '../player/QueueManager';

export function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { current, userQueue, contextTracks, contextIndex, contextId } = usePlayerStore();
  if (!open) return null;

  const upcomingContext = contextTracks.slice(contextIndex + 1);

  return (
    <aside className="queue-drawer">
      <header>
        <h2>Queue</h2>
        <button onClick={onClose}>✕</button>
      </header>

      {current && (
        <section>
          <h3>Now playing</h3>
          <Row title={current.title} subtitle={current.artist.name} cover={current.album.cover} />
        </section>
      )}

      {userQueue.length > 0 && (
        <section>
          <h3>Next in queue</h3>
          {userQueue.map((t, i) => (
            <Row key={`u-${t.id}-${i}`} title={t.title} subtitle={t.artist.name} cover={t.album.cover}
                 onRemove={() => QueueManager.remove('user', i)} />
          ))}
        </section>
      )}

      {upcomingContext.length > 0 && (
        <section>
          <h3>Next from: {contextId}</h3>
          {upcomingContext.map((t, i) => (
            <Row key={`c-${t.id}-${i}`} title={t.title} subtitle={t.artist.name} cover={t.album.cover} />
          ))}
        </section>
      )}
    </aside>
  );
}

function Row({
  title, subtitle, cover, onRemove,
}: { title: string; subtitle: string; cover: string; onRemove?: () => void }) {
  return (
    <div className="queue-row">
      <img src={cover} alt="" />
      <div className="meta">
        <div className="title">{title}</div>
        <div className="subtitle">{subtitle}</div>
      </div>
      {onRemove && <button onClick={onRemove}>✕</button>}
    </div>
  );
}
