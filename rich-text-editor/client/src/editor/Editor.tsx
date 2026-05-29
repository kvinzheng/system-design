import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toolbar } from './Toolbar';
import { SlashMenu } from './SlashMenu';
import { sanitizeHtml } from './sanitize';
import { buildKeymap, eventToShortcut } from './keymap';
import { commands } from './commands';
import type { EditorContext } from './commands';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Custom rich text editor built on `contenteditable`.
 *
 * Architecture (Lexical-inspired):
 *   - A single contenteditable root owns the DOM.
 *   - All formatting flows through the `commands` registry.
 *   - The toolbar, keymap, and slash menu are independent "plugins"
 *     that dispatch through that registry.
 *   - Pasted HTML is sanitized through a tag/attribute whitelist.
 */
export function Editor({ value, onChange, placeholder = 'Start typing or press “/” for commands…' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // `tick` forces toolbar to re-evaluate isActive on selection / input.
  const [tick, setTick] = useState(0);
  const [ctx, setCtx] = useState<EditorContext | null>(null);
  const keymap = useMemo(() => buildKeymap(), []);
  const valueRef = useRef(value);

  /** Sync incoming `value` into the DOM only when it differs from current HTML. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (value === valueRef.current && el.innerHTML === value) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
    valueRef.current = value;
  }, [value]);

  /** Build the editor context once the root is mounted. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const notify = () => {
      const html = el.innerHTML;
      valueRef.current = html;
      onChange(html);
      setTick((n) => n + 1);
    };
    const newCtx: EditorContext = {
      root: el,
      notifyChange: notify,
      focus: () => el.focus(),
    };
    setCtx(newCtx);
  }, [onChange]);

  /** Selection change → recompute toolbar state. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = () => {
      if (document.activeElement === el) setTick((n) => n + 1);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  /** Keyboard shortcuts. */
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ctx) return;
    const shortcut = eventToShortcut(e.nativeEvent);
    const id = keymap.get(shortcut);
    if (id) {
      e.preventDefault();
      commands[id]?.run(ctx);
      return;
    }
    // Sensible defaults: Enter inside blockquote/heading drops back to <p>.
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.rangeCount) {
        const node = sel.getRangeAt(0).startContainer;
        const block = nearestBlock(node, ctx.root);
        if (block && (block.tagName === 'BLOCKQUOTE' || /^H[1-6]$/.test(block.tagName))) {
          const text = block.textContent ?? '';
          if (sel.getRangeAt(0).startOffset === text.length) {
            e.preventDefault();
            document.execCommand('insertParagraph');
            document.execCommand('formatBlock', false, 'P');
            ctx.notifyChange();
          }
        }
      }
    }
  }, [ctx, keymap]);

  /** Sanitize pasted HTML. */
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const safe = sanitizeHtml(html);
      document.execCommand('insertHTML', false, safe);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    ctx?.notifyChange();
  }, [ctx]);

  const onInput = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    valueRef.current = el.innerHTML;
    onChange(el.innerHTML);
    setTick((n) => n + 1);
  }, [onChange]);

  return (
    <div className="editor-shell" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Toolbar ctx={ctx} tick={tick} />
      <div className="editor-wrap" ref={(el) => {
        // expose container for slash menu positioning if needed
        (rootRef as any).container = el;
      }}>
        <div
          ref={rootRef}
          className="editor"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-multiline="true"
          aria-label="Rich text editor"
          data-placeholder={placeholder}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {ctx && <SlashMenu ctx={ctx} containerRef={rootRef as any} />}
      </div>
    </div>
  );
}

function nearestBlock(node: Node, root: Element): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const display = window.getComputedStyle(n as Element).display;
      if (display !== 'inline' && display !== 'inline-block') return n as HTMLElement;
    }
    n = n.parentNode;
  }
  return null;
}
