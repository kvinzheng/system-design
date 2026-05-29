import { useEffect, useRef, useState } from 'react';
import { commands, SLASH_COMMANDS } from './commands';
import type { EditorContext } from './commands';

interface Props {
  ctx: EditorContext;
  /** Editor scroll container — used for positioning. */
  containerRef: React.RefObject<HTMLElement>;
}

interface MenuState {
  /** The text node we are filtering against. */
  textNode: Text;
  /** Index in the text node where the leading '/' sits. */
  slashOffset: number;
  /** Query typed after '/' (no leading slash). */
  query: string;
  /** Position to render the menu (viewport coords). */
  top: number;
  left: number;
}

export function SlashMenu({ ctx, containerRef }: Props) {
  const [state, setState] = useState<MenuState | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const stateRef = useRef<MenuState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const root = ctx.root;

    const recompute = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) {
        setState(null); return;
      }
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) {
        setState(null); return;
      }
      const text = node as Text;
      const upToCaret = text.data.slice(0, range.startOffset);
      const m = /(?:^|\s)\/([\w]*)$/.exec(upToCaret);
      if (!m) { setState(null); return; }
      const slashOffset = m.index + (m[0].startsWith('/') ? 0 : 1);

      // Position right after the caret.
      const caretRange = range.cloneRange();
      caretRange.collapse(true);
      const rect = caretRange.getBoundingClientRect();

      setState({
        textNode: text,
        slashOffset,
        query: m[1],
        top: rect.bottom + 4,
        left: rect.left,
      });
      setActiveIdx(0);
    };

    const onSelChange = () => {
      if (document.activeElement !== root) return;
      recompute();
    };
    const onInput = () => recompute();

    document.addEventListener('selectionchange', onSelChange);
    root.addEventListener('input', onInput);
    return () => {
      document.removeEventListener('selectionchange', onSelChange);
      root.removeEventListener('input', onInput);
    };
  }, [ctx]);

  const items = state
    ? SLASH_COMMANDS
        .map((id) => commands[id])
        .filter((c) => c && c.label.toLowerCase().includes(state.query.toLowerCase()))
    : [];

  // Keyboard navigation while menu is open.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % Math.max(items.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = items[activeIdx];
        if (cmd) applyCommand(s, cmd.id);
      } else if (e.key === 'Escape') {
        setState(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [state, items, activeIdx]);

  function applyCommand(s: MenuState, id: string) {
    // Remove "/query" then dispatch the command.
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.setStart(s.textNode, s.slashOffset);
    range.setEnd(s.textNode, s.slashOffset + 1 + s.query.length);
    range.deleteContents();
    sel.removeAllRanges();
    sel.addRange(range);
    commands[id]?.run(ctx);
    setState(null);
  }

  if (!state || items.length === 0) return null;

  // Position relative to viewport via fixed coords.
  return (
    <div
      className="slash-menu"
      style={{ position: 'fixed', top: state.top, left: state.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {items.map((cmd, i) => (
        <div
          key={cmd.id}
          className={`item${i === activeIdx ? ' active' : ''}`}
          onMouseEnter={() => setActiveIdx(i)}
          onClick={() => applyCommand(state, cmd.id)}
        >
          <span>{cmd.label}</span>
          <span className="hint">{cmd.icon}</span>
        </div>
      ))}
    </div>
  );
}
