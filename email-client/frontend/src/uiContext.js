// Lightweight UI-context shared with the notification subsystem so it can
// suppress redundant interruptions ("don't toast medium if the user is
// already looking at the inbox").

let activeFolder = 'inbox';

export function setActiveFolder(folder) { activeFolder = folder; }
export function getActiveFolder() { return activeFolder; }

// True when the user is actively viewing the surface where the message would
// land. In that case, sliding the row into the list is sufficient — no toast.
export function isViewingFolder(folder) {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible' && activeFolder === folder;
}
