// Tracks "what the user is currently looking at" so the notification subsystem
// can apply the universal production rule:
//
//   if user is actively viewing the surface where this notification would land,
//   don't toast — the in-context update is enough.
//
// `surface` is opaque to this module — pick any string identity your app uses
// (e.g. 'inbox', 'feed', 'channel:42', 'pr:1234').

let activeSurface = null;

export function setActiveSurface(surface) { activeSurface = surface; }
export function getActiveSurface() { return activeSurface; }

export function isViewingSurface(surface) {
  if (!surface) return false;
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible' && activeSurface === surface;
}
