/**
 * Command registry — the extensibility seam of the editor.
 *
 * Each command encapsulates a formatting action. The toolbar, keymap, and
 * slash menu all dispatch through this registry, so a new feature only has
 * to register a command to become available everywhere.
 *
 * The implementation uses `document.execCommand` for inline formatting since
 * it correctly handles selection ranges across nodes. A production editor
 * (Lexical, Tiptap, Slate) replaces this with its own state model + reconciler,
 * but the surface area here mirrors that design.
 */

export interface EditorContext {
  /** The contenteditable root. */
  root: HTMLElement;
  /** Emit a content-changed event so React syncs. */
  notifyChange: () => void;
  /** Focus + restore the saved selection. */
  focus: () => void;
}

export interface EditorCommand {
  id: string;
  label: string;
  /** Single character / short icon shown in the toolbar. */
  icon: string;
  /** Optional keyboard shortcut, e.g. 'Mod+B'. */
  shortcut?: string;
  /** True when the current selection is inside this format. */
  isActive?: (ctx: EditorContext) => boolean;
  /** Apply the command. */
  run: (ctx: EditorContext, arg?: unknown) => void;
}

function execInline(cmd: string) {
  return (ctx: EditorContext) => {
    document.execCommand(cmd, false);
    ctx.notifyChange();
  };
}

function inlineActive(cmd: string) {
  return () => {
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };
}

function formatBlock(tag: string) {
  return (ctx: EditorContext) => {
    document.execCommand('formatBlock', false, tag);
    ctx.notifyChange();
  };
}

function blockActive(tag: string) {
  return (ctx: EditorContext) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== ctx.root) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === tag) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };
}

export const commands: Record<string, EditorCommand> = {
  bold: {
    id: 'bold', label: 'Bold', icon: 'B', shortcut: 'Mod+B',
    run: execInline('bold'), isActive: inlineActive('bold'),
  },
  italic: {
    id: 'italic', label: 'Italic', icon: 'I', shortcut: 'Mod+I',
    run: execInline('italic'), isActive: inlineActive('italic'),
  },
  underline: {
    id: 'underline', label: 'Underline', icon: 'U', shortcut: 'Mod+U',
    run: execInline('underline'), isActive: inlineActive('underline'),
  },
  strike: {
    id: 'strike', label: 'Strikethrough', icon: 'S',
    run: execInline('strikeThrough'), isActive: inlineActive('strikeThrough'),
  },
  code: {
    id: 'code', label: 'Inline code', icon: '<>', shortcut: 'Mod+E',
    run: (ctx) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      // Wrap the selection in a <code> element.
      const code = document.createElement('code');
      try {
        code.appendChild(range.extractContents());
        range.insertNode(code);
        sel.removeAllRanges();
        const r = document.createRange();
        r.selectNodeContents(code);
        sel.addRange(r);
        ctx.notifyChange();
      } catch {
        /* selection spans block boundaries — bail. */
      }
    },
    isActive: (ctx) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== ctx.root) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'CODE') return true;
        node = node.parentNode;
      }
      return false;
    },
  },

  h1: { id: 'h1', label: 'Heading 1', icon: 'H1', run: formatBlock('H1'), isActive: blockActive('H1') },
  h2: { id: 'h2', label: 'Heading 2', icon: 'H2', run: formatBlock('H2'), isActive: blockActive('H2') },
  h3: { id: 'h3', label: 'Heading 3', icon: 'H3', run: formatBlock('H3'), isActive: blockActive('H3') },
  paragraph: { id: 'paragraph', label: 'Paragraph', icon: '¶', run: formatBlock('P'), isActive: blockActive('P') },
  blockquote: {
    id: 'blockquote', label: 'Quote', icon: '“ ”',
    run: formatBlock('BLOCKQUOTE'), isActive: blockActive('BLOCKQUOTE'),
  },

  ul: {
    id: 'ul', label: 'Bulleted list', icon: '•',
    run: (ctx) => { document.execCommand('insertUnorderedList'); ctx.notifyChange(); },
    isActive: inlineActive('insertUnorderedList'),
  },
  ol: {
    id: 'ol', label: 'Numbered list', icon: '1.',
    run: (ctx) => { document.execCommand('insertOrderedList'); ctx.notifyChange(); },
    isActive: inlineActive('insertOrderedList'),
  },

  link: {
    id: 'link', label: 'Link', icon: '🔗',
    run: (ctx) => {
      const url = window.prompt('Enter URL:');
      if (!url) return;
      const safe = /^(https?:|mailto:|\/|#)/i.test(url) ? url : `https://${url}`;
      document.execCommand('createLink', false, safe);
      ctx.notifyChange();
    },
  },
  unlink: {
    id: 'unlink', label: 'Remove link', icon: '⛓',
    run: (ctx) => { document.execCommand('unlink'); ctx.notifyChange(); },
  },

  undo: { id: 'undo', label: 'Undo', icon: '↶', shortcut: 'Mod+Z',
    run: (ctx) => { document.execCommand('undo'); ctx.notifyChange(); } },
  redo: { id: 'redo', label: 'Redo', icon: '↷', shortcut: 'Mod+Shift+Z',
    run: (ctx) => { document.execCommand('redo'); ctx.notifyChange(); } },

  clearFormatting: {
    id: 'clearFormatting', label: 'Clear formatting', icon: 'Tx',
    run: (ctx) => {
      document.execCommand('removeFormat');
      document.execCommand('formatBlock', false, 'P');
      ctx.notifyChange();
    },
  },
};

export const TOOLBAR_GROUPS: string[][] = [
  ['undo', 'redo'],
  ['paragraph', 'h1', 'h2', 'h3'],
  ['bold', 'italic', 'underline', 'strike', 'code'],
  ['ul', 'ol', 'blockquote'],
  ['link', 'unlink', 'clearFormatting'],
];

export const SLASH_COMMANDS: string[] = [
  'h1', 'h2', 'h3', 'paragraph', 'blockquote', 'ul', 'ol', 'code',
];
