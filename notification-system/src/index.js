// Public API: framework-free core.

export { configure } from './core/configure';
export { notify, _resetNotify } from './core/notify';
export {
  subscribe, getState, addBanner, dismissBanner, clearOverflow,
  pauseAging, resumeAging, maxBanners,
} from './core/stack';
export { setActiveSurface, getActiveSurface, isViewingSurface } from './core/uiContext';
export { getPrefs, setPrefs, subscribePrefs, densityCap, isInQuietHours, setStorageKey } from './core/prefs';
export { ensureNotificationPermission, osNotify, playBlip } from './core/osBridge';
export { enqueueLow } from './core/lowDigest';
