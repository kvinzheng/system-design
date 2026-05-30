// Client-side last-mile spam shield. Three defenses, in order:
//
//   1. MUTED SENDERS  → drop entirely (user-controlled, persisted)
//   2. CONTENT DEDUPE → drop if same fingerprint seen within `dedupeWindowMs`
//   3. RATE LIMIT     → downgrade to 'low' if sender exceeds `maxPerSender`/min
//
// Production note: every check here MUST also live server-side. The client
// shield only softens what already crossed the network; a malicious client
// will simply not call evaluate().
//
// Inputs expect `meta.sender` (any opaque sender id) to be set. Without it
// only content dedupe applies.

const MUTE_KEY = 'priority-notif:muted-senders:v1';

let config = {
  windowMs: 60_000,
  maxPerSender: 5,        // > N per windowMs from one sender => downgrade
  dedupeWindowMs: 30_000, // identical (sender, fingerprint) within window => drop
  trustedSenders: [],     // bypass rate-limit (still subject to mute + dedupe)
};

const senderHits = new Map();      // sender → [ts, ts, ...]
const fingerprintSeen = new Map(); // `${sender}:${fp}` → ts
let mutedSenders = loadMutes();
const muteListeners = new Set();

export function configureSpamShield(opts = {}) {
  config = { ...config, ...opts };
}

function loadMutes() {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(MUTE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveMutes() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUTE_KEY, JSON.stringify([...mutedSenders]));
    }
  } catch {}
  for (const l of muteListeners) l([...mutedSenders]);
}

export function muteSender(sender)   { mutedSenders.add(sender); saveMutes(); }
export function unmuteSender(sender) { mutedSenders.delete(sender); saveMutes(); }
export function getMutedSenders()    { return [...mutedSenders]; }
export function subscribeMutes(fn)   { muteListeners.add(fn); fn([...mutedSenders]); return () => muteListeners.delete(fn); }

// Cheap content fingerprint. Real systems use SimHash/MinHash so near-duplicates
// also collapse; this is just length + first-chars hash.
function fingerprint(input) {
  const s = `${input.title || ''}|${input.body || ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

// Returns: { action: 'pass'|'drop'|'downgrade', reason, input }
// Always returns an input the caller should use (possibly mutated for downgrade).
export function evaluate(input) {
  const sender = input.meta && input.meta.sender;
  const now = Date.now();

  // 1. MUTE
  if (sender && mutedSenders.has(sender)) {
    return { action: 'drop', reason: `muted:${sender}`, input };
  }

  // 2. DEDUPE
  const fpKey = `${sender || '*'}:${fingerprint(input)}`;
  const seenAt = fingerprintSeen.get(fpKey);
  if (seenAt && now - seenAt < config.dedupeWindowMs) {
    return { action: 'drop', reason: 'duplicate', input };
  }
  fingerprintSeen.set(fpKey, now);
  // Lazy cleanup of stale fingerprints
  if (fingerprintSeen.size > 1000) {
    for (const [k, ts] of fingerprintSeen) {
      if (now - ts > config.dedupeWindowMs) fingerprintSeen.delete(k);
    }
  }

  // 3. RATE LIMIT
  if (sender) {
    const arr = (senderHits.get(sender) || []).filter((t) => now - t < config.windowMs);
    arr.push(now);
    senderHits.set(sender, arr);
    const trusted = config.trustedSenders.includes(sender);
    if (arr.length > config.maxPerSender && input.priority !== 'high' && !trusted) {
      // Don't downgrade HIGH — by definition the user wants to know.
      // Don't downgrade TRUSTED senders — they're celebrities/legit-noisy,
      // let the coalescer collapse them into one banner with a count.
      return {
        action: 'downgrade',
        reason: `rate-limit:${arr.length}/${config.windowMs / 1000}s`,
        input: { ...input, priority: 'low', meta: { ...(input.meta || {}), spamReason: `rate-limit:${arr.length}/min` } },
      };
    }
  }

  return { action: 'pass', input };
}

// Test/debug seam
export function _reset() {
  senderHits.clear();
  fingerprintSeen.clear();
  mutedSenders = new Set();
  saveMutes();
}
