// Pure function: spam shield evaluation.
// Owns no state — callers pass refs to the mutable maps and the mute set.
//
// Returns: { action: 'pass'|'drop'|'downgrade', reason, input }
// `input` is always returned (possibly mutated for downgrade) so callers
// can pipe it straight into the next stage.

export const SPAM_DEFAULTS = {
  windowMs: 60_000,
  maxPerSender: 5,
  dedupeWindowMs: 30_000,
  trustedSenders: [],
};

export function evaluateSpam(input, config, { mutedSenders, senderHits, fingerprintSeen }) {
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
      return {
        action: 'downgrade',
        reason: `rate-limit:${arr.length}/${config.windowMs / 1000}s`,
        input: {
          ...input,
          priority: 'low',
          meta: { ...(input.meta || {}), spamReason: `rate-limit:${arr.length}/min` },
        },
      };
    }
  }

  return { action: 'pass', input };
}

function fingerprint(input) {
  const s = `${input.title || ''}|${input.body || ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
}
