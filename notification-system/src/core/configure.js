// Single configure() that wires up every core knob in one place.

import { setStorageKey } from './prefs';
import { configureNotify } from './notify';
import { configureDigest } from './lowDigest';
import { configureOSBridge, ensureNotificationPermission } from './osBridge';

export function configure(opts = {}) {
  if (opts.storageKey) setStorageKey(opts.storageKey);
  configureNotify({ onBadge: opts.onBadge });
  configureDigest({
    windowMs: opts.digestWindowMs,
    digestTitle: opts.digestTitle,
  });
  configureOSBridge({ soundDebounceMs: opts.soundDebounceMs });
  if (opts.requestOSPermission) ensureNotificationPermission();
}
