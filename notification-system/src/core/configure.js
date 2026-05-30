// Single configure() that wires up every core knob in one place.

import { setStorageKey } from './prefs.js';
import { configureNotify } from './notify.js';
import { configureDigest } from './lowDigest.js';
import { configureOSBridge, ensureNotificationPermission } from './osBridge.js';
import { configureSpamShield } from './spamShield.js';

export function configure(opts = {}) {
  if (opts.storageKey) setStorageKey(opts.storageKey);
  configureNotify({ onBadge: opts.onBadge, onShieldVerdict: opts.onShieldVerdict });
  configureDigest({
    windowMs: opts.digestWindowMs,
    digestTitle: opts.digestTitle,
  });
  configureOSBridge({ soundDebounceMs: opts.soundDebounceMs });
  configureSpamShield(opts.spamShield || {});
  if (opts.requestOSPermission) ensureNotificationPermission();
}
