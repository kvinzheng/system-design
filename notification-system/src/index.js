// Public API: framework-free core.

export { configure } from './core/configure.js';
export { notify, _resetNotify } from './core/notify.js';
export {
  subscribe, getState, addBanner, dismissBanner, clearOverflow,
  pauseAging, resumeAging, maxBanners,
} from './core/stack.js';
export { setActiveSurface, getActiveSurface, isViewingSurface } from './core/uiContext.js';
export { getPrefs, setPrefs, subscribePrefs, densityCap, isInQuietHours, setStorageKey } from './core/prefs.js';
export { ensureNotificationPermission, osNotify, playBlip } from './core/osBridge.js';
export { enqueueLow } from './core/lowDigest.js';
export {
  muteSender, unmuteSender, getMutedSenders, subscribeMutes,
  evaluate as evaluateSpam,
} from './core/spamShield.js';
