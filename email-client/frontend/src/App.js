import React, { useEffect, useMemo, useState } from 'react';
import { listMessages, patchMessage, deleteMessage, syncInbox, isOnline, isForcedOffline, setForcedOffline } from './api';
import { socket } from './socket';
import { getOutbox, flushOutbox } from './outbox';
import { ensureNotificationPermission, notifyNewMail } from './notifications';
import Composer from './components/Composer';
import MessageList from './components/MessageList';
import Reader from './components/Reader';
import Sidebar from './components/Sidebar';
import Banner from './components/Banner';

const FOLDERS = ['inbox', 'sent', 'drafts', 'outbox', 'trash'];

export default function App() {
  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [outboxCount, setOutboxCount] = useState(getOutbox().length);
  const [online, setOnline] = useState(isOnline());
  const [composing, setComposing] = useState(false);
  const [banners, setBanners] = useState([]); // stack of {id, priority, message?, summary?, persistent?}

  const refreshOnlineState = () => setOnline(isOnline());

  const dismissBanner = (id) => setBanners((prev) => prev.filter((b) => b.id !== id));

  // Load whenever folder or query changes
  const reload = async () => {
    if (folder === 'outbox') {
      const items = getOutbox().map((o) => ({
        id: o.clientId,
        fromAddress: 'you@example.com',
        fromName: 'You (queued)',
        toAddress: o.to,
        subject: o.subject,
        body: o.body,
        receivedAt: o.queuedAt,
        folder: 'outbox',
        read: true,
        _queued: true,
      }));
      setMessages(items);
      return;
    }
    if (!isOnline()) return; // serve previous list
    setLoading(true);
    try {
      const data = await listMessages({ folder, q, pageSize: 50 });
      setMessages(data.items);
      // cache for offline browsing
      localStorage.setItem(`cache:${folder}`, JSON.stringify(data.items));
    } catch (e) {
      const cached = JSON.parse(localStorage.getItem(`cache:${folder}`) || '[]');
      setMessages(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [folder, q]);

  // Unread count
  useEffect(() => {
    setUnread(messages.filter((m) => !m.read).length);
  }, [messages]);

  // Online/offline listeners + outbox flush + notifications permission
  useEffect(() => {
    const onOnline = () => { refreshOnlineState(); flushOutbox(); reload(); };
    const onOffline = () => refreshOnlineState();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('outbox:changed', () => setOutboxCount(getOutbox().length));
    ensureNotificationPermission();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line
  }, []);

  // Realtime: new mail push
  useEffect(() => {
    const onNew = (msg) => {
      notifyNewMail(msg);
      if (folder === 'inbox') {
        setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [msg, ...prev]));
      }
    };
    const onBanner = (e) => {
      const detail = e.detail;
      setBanners((prev) => {
        // Cap stack at 3; drop oldest non-persistent first, else oldest.
        let next = [...prev, detail];
        if (next.length > 3) {
          const dropIdx = next.findIndex((b) => !b.persistent);
          next.splice(dropIdx >= 0 ? dropIdx : 0, 1);
        }
        return next;
      });
      if (detail.autoDismissMs) {
        setTimeout(() => dismissBanner(detail.id), detail.autoDismissMs);
      }
    };
    const onOpenFromOS = (e) => {
      const m = e.detail;
      setFolder('inbox');
      setSelected(m);
    };
    socket.on('mail:new', onNew);
    window.addEventListener('mail:banner', onBanner);
    window.addEventListener('mail:open', onOpenFromOS);
    return () => {
      socket.off('mail:new', onNew);
      window.removeEventListener('mail:banner', onBanner);
      window.removeEventListener('mail:open', onOpenFromOS);
    };
  }, [folder]);

  const onSelect = async (m) => {
    setSelected(m);
    if (!m.read && !m._queued && isOnline()) {
      try {
        const updated = await patchMessage(m.id, { read: true });
        setMessages((prev) => prev.map((p) => (p.id === m.id ? updated : p)));
      } catch {}
    }
  };

  const onDelete = async (m) => {
    if (m._queued) {
      // remove from outbox
      const next = getOutbox().filter((o) => o.clientId !== m.id);
      localStorage.setItem('email:outbox', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('outbox:changed'));
      reload();
      setSelected(null);
      return;
    }
    await deleteMessage(m.id);
    setSelected(null);
    reload();
  };

  const onToggleOffline = () => {
    setForcedOffline(!isForcedOffline());
    refreshOnlineState();
    if (isOnline()) { flushOutbox(); reload(); }
  };

  const folderCounts = useMemo(() => ({
    inbox: unread,
    outbox: outboxCount,
  }), [unread, outboxCount]);

  return (
    <div style={styles.app}>
      <header style={styles.topbar}>
        <div style={styles.brand}>📬 Mailbox</div>
        <input
          style={styles.search}
          placeholder="Search subject, body, sender…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={styles.tools}>
          <button style={styles.btnPrimary} onClick={() => setComposing(true)}>Compose</button>
          <button style={styles.btn} onClick={async () => { await syncInbox().catch(() => {}); reload(); }} disabled={!online}>Sync</button>
          <div style={styles.priorityGroup} title="Simulate an incoming message of this priority">
            <button style={{ ...styles.prioBtn, ...styles.prioHigh }} disabled={!online}
              onClick={async () => { await syncInbox('high').catch(() => {}); reload(); }}>● High</button>
            <button style={{ ...styles.prioBtn, ...styles.prioMed }} disabled={!online}
              onClick={async () => { await syncInbox('medium').catch(() => {}); reload(); }}>● Med</button>
            <button style={{ ...styles.prioBtn, ...styles.prioLow }} disabled={!online}
              onClick={async () => { await syncInbox('low').catch(() => {}); reload(); }}>○ Low</button>
          </div>
          <button style={styles.btn} onClick={onToggleOffline}>
            {online ? '🟢 Online' : '🔴 Offline'}
          </button>
        </div>
      </header>

      {banners.length > 0 && (
        <div>
          {banners.map((b) => (
            <Banner
              key={b.id}
              priority={b.priority}
              message={b.message}
              summary={b.summary}
              onOpen={() => {
                setFolder('inbox');
                const target = b.message || (b.summary && b.summary.messages[0]);
                if (target) setSelected(target);
                dismissBanner(b.id);
              }}
              onDismiss={() => dismissBanner(b.id)}
            />
          ))}
          {banners.length === 3 && (
            <div style={{ padding: '4px 16px', fontSize: 12, color: '#6b7280', background: '#f9fafb' }}>
              Showing 3 most recent. Older notifications collapsed into badge.
            </div>
          )}
        </div>
      )}

      <div style={styles.body}>
        <Sidebar folders={FOLDERS} active={folder} counts={folderCounts} onSelect={setFolder} />
        <MessageList items={messages} selectedId={selected?.id} onSelect={onSelect} loading={loading} />
        <Reader message={selected} onDelete={onDelete} onReply={(m) => { setComposing({ to: m.fromAddress, subject: m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`, body: `\n\n---\nOn ${new Date(m.receivedAt).toLocaleString()}, ${m.fromAddress} wrote:\n> ${(m.body||'').replace(/\n/g, '\n> ')}` }); }} />
      </div>

      {composing && (
        <Composer
          initial={typeof composing === 'object' ? composing : {}}
          onClose={() => setComposing(false)}
          onSent={() => { setComposing(false); reload(); }}
        />
      )}
    </div>
  );
}

const styles = {
  app: { height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f3f4f6', color: '#111' },
  topbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#0078d4', color: '#fff' },
  brand: { fontWeight: 700, fontSize: 18 },
  search: { flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', fontSize: 14 },
  tools: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: { padding: '6px 12px', border: 'none', borderRadius: 6, background: '#ffffff22', color: '#fff', cursor: 'pointer', fontWeight: 600 },
  btnPrimary: { padding: '6px 14px', border: 'none', borderRadius: 6, background: '#fff', color: '#0078d4', cursor: 'pointer', fontWeight: 700 },
  priorityGroup: { display: 'flex', gap: 4, padding: '2px 4px', background: '#ffffff18', borderRadius: 6 },
  prioBtn: { padding: '4px 10px', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  prioHigh: { background: '#dc2626' },
  prioMed: { background: '#2563eb' },
  prioLow: { background: '#6b7280' },
  body: { flex: 1, display: 'grid', gridTemplateColumns: '200px 360px 1fr', minHeight: 0 },
};
