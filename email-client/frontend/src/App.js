import React, { useEffect, useMemo, useState } from 'react';
import { listMessages, patchMessage, deleteMessage, syncInbox, isOnline, isForcedOffline, setForcedOffline } from './api';
import { socket } from './socket';
import { getOutbox, flushOutbox } from './outbox';
import { ensureNotificationPermission, notifyNewMail } from './notifications';
import { subscribe as subscribeStack, dismissBanner, clearOverflow, pauseAging, resumeAging } from './notificationStack';
import { setActiveFolder } from './uiContext';
import Composer from './components/Composer';
import MessageList from './components/MessageList';
import Reader from './components/Reader';
import Sidebar from './components/Sidebar';
import Banner from './components/Banner';
import OverflowPill from './components/OverflowPill';
import SettingsPopover from './components/SettingsPopover';
import { getPrefs, setPrefs, subscribePrefs } from './prefs';

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
  const [stack, setStack] = useState({ visible: [], overflow: [], maxVisible: 3 });
  const [prefs, setPrefsState] = useState(getPrefs());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => subscribePrefs(setPrefsState), []);

  const refreshOnlineState = () => setOnline(isOnline());

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

  // Tell the notification subsystem which folder is currently active.
  useEffect(() => { setActiveFolder(folder); }, [folder]);

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
    const onOpenFromOS = (e) => {
      const m = e.detail;
      setFolder('inbox');
      setSelected(m);
    };
    socket.on('mail:new', onNew);
    window.addEventListener('mail:open', onOpenFromOS);
    const unsubscribe = subscribeStack(setStack);
    return () => {
      socket.off('mail:new', onNew);
      window.removeEventListener('mail:open', onOpenFromOS);
      unsubscribe();
    };
  }, [folder]);

  const openBanner = (b) => {
    setFolder('inbox');
    const target = b.message || (b.summary && b.summary.messages[0]);
    if (target) setSelected(target);
    dismissBanner(b.id);
  };

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

  // Inbox view: pin high-priority unread to top, then chronological.
  const displayMessages = useMemo(() => {
    if (folder !== 'inbox') return messages;
    const pinned = messages.filter((m) => m.priority === 'high' && !m.read);
    const rest = messages.filter((m) => !(m.priority === 'high' && !m.read));
    return [...pinned, ...rest];
  }, [messages, folder]);

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
          <button
            style={{ ...styles.btn, ...(prefs.focusMode ? styles.btnActive : null) }}
            onClick={() => setPrefs({ focusMode: !prefs.focusMode })}
            title="Focus mode — only high-priority alerts interrupt"
          >
            {prefs.focusMode ? '🌙 Focus' : '☀️ Normal'}
          </button>
          <button
            style={styles.btn}
            onClick={() => setShowSettings((v) => !v)}
            title="Notification preferences"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>
      {showSettings && <SettingsPopover onClose={() => setShowSettings(false)} />}

      <div style={styles.body}>
        <Sidebar folders={FOLDERS} active={folder} counts={folderCounts} onSelect={setFolder} />
        <MessageList items={displayMessages} selectedId={selected?.id} onSelect={onSelect} loading={loading} />
        <Reader message={selected} onDelete={onDelete} onReply={(m) => { setComposing({ to: m.fromAddress, subject: m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`, body: `\n\n---\nOn ${new Date(m.receivedAt).toLocaleString()}, ${m.fromAddress} wrote:\n> ${(m.body||'').replace(/\n/g, '\n> ')}` }); }} />
      </div>

      {/* Floating overlay column at bottom-right — toasts do not take layout space */}
      <div style={styles.toastOverlay} aria-label="Notifications">
        {stack.visible.map((b) => (
          <Banner
            key={b.id}
            priority={b.priority}
            message={b.message || b.latestMessage}
            summary={b.summary}
            count={b.count}
            onOpen={() => openBanner(b)}
            onDismiss={() => dismissBanner(b.id)}
            onMouseEnter={() => pauseAging(b.id)}
            onMouseLeave={() => resumeAging(b.id)}
          />
        ))}
        {stack.overflow.length > 0 && (
          <div style={styles.overflowWrap}>
            <OverflowPill
              items={stack.overflow}
              onOpen={openBanner}
              onDismiss={dismissBanner}
              onClearAll={clearOverflow}
            />
          </div>
        )}
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
  btnActive: { background: '#fbbf24', color: '#111' },
  btnPrimary: { padding: '6px 14px', border: 'none', borderRadius: 6, background: '#fff', color: '#0078d4', cursor: 'pointer', fontWeight: 700 },
  priorityGroup: { display: 'flex', gap: 4, padding: '2px 4px', background: '#ffffff18', borderRadius: 6 },
  prioBtn: { padding: '4px 10px', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  prioHigh: { background: '#dc2626' },
  prioMed: { background: '#2563eb' },
  prioLow: { background: '#6b7280' },
  body: { flex: 1, display: 'grid', gridTemplateColumns: '200px 360px 1fr', minHeight: 0 },
  toastOverlay: {
    position: 'fixed', bottom: 16, right: 16, zIndex: 40,
    display: 'flex', flexDirection: 'column-reverse', gap: 8,
    pointerEvents: 'none', // children re-enable
    maxHeight: 'calc(100vh - 100px)',
  },
  overflowWrap: {
    pointerEvents: 'auto', width: 360,
    background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden',
  },
};
