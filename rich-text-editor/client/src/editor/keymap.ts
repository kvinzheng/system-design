import type { EditorCommand, EditorContext } from './commands';
import { commands } from './commands';

/** Build a shortcut → commandId map from the registry. */
export function buildKeymap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const cmd of Object.values(commands)) {
    if (cmd.shortcut) map.set(normalize(cmd.shortcut), cmd.id);
  }
  return map;
}

/** Normalize a shortcut string to a canonical key. */
function normalize(shortcut: string): string {
  return shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .sort()
    .join('+');
}

/** Convert a KeyboardEvent into the same canonical key. */
export function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  // Skip the modifier itself
  if (!['control', 'meta', 'shift', 'alt'].includes(key)) parts.push(key);
  return parts.sort().join('+');
}

export function dispatch(id: string, ctx: EditorContext): boolean {
  const cmd: EditorCommand | undefined = commands[id];
  if (!cmd) return false;
  cmd.run(ctx);
  return true;
}
