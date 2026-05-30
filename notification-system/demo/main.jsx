import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  NotificationProvider,
  NotificationOverlay,
  SettingsPopover,
  useNotifications,
} from '../src/index.js';

// ── Inner demo (must be inside the provider to call useNotifications) ──
function Demo() {
  const {
    notify, setActiveSurface,
    muteSender, unmuteSender, mutedSenders,
    activeSurface,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [badge, setBadge]   = useState({ high: 0, medium: 0, low: 0 });
  const [activity, setActivity] = useState([]);
  const [shieldLog, setShieldLog] = useState([]);
  const [lowQueue, setLowQueue] = useState({ count: 0, fireAt: null });
  const [now, setNow] = useState(Date.now());
  const [sender, setSender] = useState('alice');
  const [surface, setSurface] = useState('dashboard');

  useEffect(() => { setActiveSurface(surface); }, [surface, setActiveSurface]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (lowQueue.fireAt && now >= lowQueue.fireAt) setLowQueue({ count: 0, fireAt: null });
  }, [now, lowQueue.fireAt]);

  const counter = useRef(0);
  const fire = (priority, opts = {}) => {
    counter.current += 1;
    const n = counter.current;
    notify({
      priority,
      title: opts.title || `${priority.toUpperCase()} event #${n}`,
      body: opts.body || `Triggered at ${new Date().toLocaleTimeString()}`,
      surface: opts.surface,
      meta: { sender: opts.sender || sender },
      onOpen: () => alert(`Opened ${priority} #${n}`),
    });
  };

  const fireBurst = (priority, count, opts = {}) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => fire(priority, {
        ...opts,
        title: opts.title
          ? `${opts.title} ${i + 1}/${count}`
          : `${priority.toUpperCase()} burst ${i + 1}/${count}`,
      }), i * 50);
    }
  };

  const spamBurst = () => {
    for (let i = 0; i < 15; i++) {
      setTimeout(() => notify({
        priority: 'medium',
        title: `🔥 Hot deal! Click now ${i + 1}/15`,
        body: 'Limited time offer just for you',
        meta: { sender: 'spammer' },
      }), i * 30);
    }
  };
  const dupeBurst = () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => notify({
        priority: 'medium',
        title: 'Verify your account',
        body: 'Click here to verify',
        meta: { sender: 'phisher' },
      }), i * 30);
    }
  };
  const celebrityBurst = () => {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => notify({
        priority: 'medium',
        title: `🌟 New post #${i + 1} from celebrity`,
        body: `Post content ${Math.random().toString(36).slice(2, 8)}`,
        meta: { sender: 'celebrity' },
      }), i * 40);
    }
  };

  return (
    <>
      <h1>priority-notifications <span style={{ fontSize: 14, color: '#64748b' }}>· React-only</span></h1>
      <p className="lead">
        Generic 3-tier notification system. Now built React-first:
        <code> &lt;NotificationProvider&gt;</code> owns all state,
        <code> useNotifications()</code> is the API.
      </p>

      <div className="card">
        <h2>1. Fire a single notification</h2>
        <div className="row">
          <label>Sender:&nbsp;
            <select value={sender} onChange={(e) => setSender(e.target.value)}>
              <option value="alice">alice</option>
              <option value="bob">bob</option>
              <option value="newsletter">newsletter</option>
            </select>
          </label>
          <button className="high"   onClick={() => fire('high')}>● High</button>
          <button className="medium" onClick={() => fire('medium')}>● Medium</button>
          <button className="low"    onClick={() => fire('low')}>● Low</button>
          <button className="gear" onClick={() => setShowSettings(true)}>⚙ Settings</button>
        </div>
      </div>

      <div className="card">
        <h2>2. Fire a burst (test coalescing)</h2>
        <div className="row">
          <button onClick={() => fireBurst('high', 5)}>5× high (per-group)</button>
          <button onClick={() => fireBurst('medium', 12)}>12× medium (1 rolling toast)</button>
          <button onClick={() => fireBurst('low', 8)}>8× low (1 digest in 10s)</button>
        </div>
      </div>

      <div className="card" style={{ borderLeft: '3px solid #f97316' }}>
        <h2>🛡️ Spam shield</h2>
        <p className="lead" style={{ fontSize: 13 }}>
          Three defenses run before the banner stack: <b>mute</b> (drop),
          <b> dedupe</b> (drop identical within 30s),
          <b> rate-limit</b> (downgrade to low &gt;5/min — bypassed for trusted senders).
        </p>
        <div className="row">
          <button className="medium" onClick={spamBurst}>
            🔥 15× from <code>spammer</code> (rate-limit downgrade)
          </button>
          <button className="medium" onClick={dupeBurst}>
            🎯 5× identical from <code>phisher</code> (dedupe drop)
          </button>
          <button className="medium" style={{ background: '#7c3aed' }} onClick={celebrityBurst}>
            🌟 20× from <code>celebrity</code> (trusted → coalesce)
          </button>
          <button onClick={() => muteSender(sender)}>
            🔇 Mute <code>{sender}</code>
          </button>
        </div>
        {mutedSenders.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>MUTED SENDERS</div>
            <div className="row">
              {mutedSenders.map((s) => (
                <span key={s} className="chip" style={{ background: '#3b0764', color: '#e9d5ff' }}>
                  {s}
                  <button onClick={() => unmuteSender(s)} style={{ marginLeft: 6, background: 'transparent', color: '#e9d5ff', border: 'none', cursor: 'pointer' }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>SHIELD VERDICTS (live)</div>
          <ShieldLogConsumer onLog={setShieldLog} />
          <div className="activity">
            {shieldLog.length === 0 && <div style={{ color: '#64748b' }}>nothing blocked yet</div>}
            {shieldLog.map((v) => (
              <div key={v.id} className="item">
                <span className="chip" style={{
                  background: v.verdict === 'drop' ? '#7f1d1d' : '#78350f',
                  color: v.verdict === 'drop' ? '#fecaca' : '#fde68a',
                  marginLeft: 0,
                }}>{v.verdict}</span>
                <span style={{ flex: 1 }}>
                  <code>{v.sender || '?'}</code> · {v.title}
                  <span style={{ color: '#64748b', marginLeft: 6 }}>({v.reason})</span>
                </span>
                <span className="ts">{new Date(v.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>3. Surface suppression</h2>
        <p className="lead" style={{ fontSize: 13 }}>
          Active surface: <code>{activeSurface || '(none)'}</code>. Medium
          toasts whose <code>surface</code> matches will be suppressed.
        </p>
        <div className="row">
          <label>Viewing:&nbsp;
            <select value={surface} onChange={(e) => setSurface(e.target.value)}>
              <option value="dashboard">dashboard</option>
              <option value="alerts">alerts</option>
              <option value="messages">messages</option>
            </select>
          </label>
          <button className="medium" onClick={() => fire('medium', { surface: 'dashboard', title: 'dashboard ping' })}>Medium → dashboard</button>
          <button className="medium" onClick={() => fire('medium', { surface: 'alerts', title: 'alerts ping' })}>Medium → alerts</button>
        </div>
      </div>

      <div className="card">
        <h2>Badge counters</h2>
        <div className="row">
          <span>High: <code>{badge.high}</code></span>
          <span>Medium: <code>{badge.medium}</code></span>
          <span>Low: <code>{badge.low}</code></span>
          {lowQueue.count > 0 && (
            <span className="chip warn">
              Low queue: {lowQueue.count} · digest in {Math.max(0, Math.ceil((lowQueue.fireAt - now) / 1000))}s
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Activity feed (every notify, regardless of tier)</h2>
        <BadgeAndActivityWiring
          onBadge={(priority, item) => {
            setBadge((b) => ({ ...b, [priority]: b[priority] + 1 }));
            setActivity((a) => [
              { priority, title: item.title, ts: Date.now(), id: Math.random() },
              ...a,
            ].slice(0, 12));
            if (priority === 'low') {
              setLowQueue((q) => ({ count: q.count + 1, fireAt: q.fireAt || (Date.now() + 10_000) }));
            }
          }}
        />
        <div className="activity">
          {activity.length === 0 && <div style={{ color: '#64748b' }}>nothing yet</div>}
          {activity.map((a) => (
            <div key={a.id} className="item">
              <span className={`dot ${a.priority}`} />
              <span style={{ flex: 1 }}>{a.title}</span>
              <span className="ts">{new Date(a.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

      <NotificationOverlay />
      {showSettings && <SettingsPopover onClose={() => setShowSettings(false)} />}
    </>
  );
}

// The provider takes onBadge/onShieldVerdict as PROPS. To let the inner
// Demo own the lists, we wire those callbacks up from inside via these
// two no-render helpers that mutate state in the Demo closure.
let badgeCb = null, shieldCb = null;
function BadgeAndActivityWiring({ onBadge }) {
  useEffect(() => { badgeCb = onBadge; return () => { badgeCb = null; }; }, [onBadge]);
  return null;
}
function ShieldLogConsumer({ onLog }) {
  useEffect(() => {
    shieldCb = (entry) => onLog((l) => [entry, ...l].slice(0, 10));
    return () => { shieldCb = null; };
  }, [onLog]);
  return null;
}

function App() {
  return (
    <NotificationProvider
      digestWindowMs={10_000}
      digestTitle={(n) => `${n} low-priority items in the last 10s`}
      requestOSPermission={true}
      spamShield={{ windowMs: 60_000, maxPerSender: 5, dedupeWindowMs: 30_000, trustedSenders: ['celebrity', 'pagerduty'] }}
      onBadge={({ priority, item }) => { if (badgeCb) badgeCb(priority, item); }}
      onShieldVerdict={({ verdict, reason, input }) => {
        if (verdict === 'pass' || !shieldCb) return;
        shieldCb({ verdict, reason, sender: input.meta && input.meta.sender, title: input.title, ts: Date.now(), id: Math.random() });
      }}
    >
      <Demo />
    </NotificationProvider>
  );
}

createRoot(document.getElementById('app')).render(<App />);
