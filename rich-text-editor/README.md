# Rich Text Editor — Full Stack

A WYSIWYG rich text editor with a plugin-based command architecture (inspired by Lexical / Tiptap / Slate), backed by a small Express API for document persistence.

## Stack

- **Client**: React 18 + TypeScript + Vite. Custom `contenteditable`-based editor — no third-party editor library.
- **Server**: Express + TypeScript with JSON-file persistence.

## Features

**Editor**
- Block formats: Paragraph, H1/H2/H3, Blockquote, Bulleted & Numbered lists
- Inline formats: Bold, Italic, Underline, Strikethrough, Inline code, Link
- Toolbar with live active-state highlighting based on the current selection
- Keyboard shortcuts (`⌘B`, `⌘I`, `⌘U`, `⌘E`, `⌘Z`, `⌘⇧Z`) wired from the command registry
- Slash menu (`/heading`, `/quote`, `/bulleted`, …) with arrow-key navigation
- Paste sanitization with a tag/attribute whitelist (no scripts, no event handlers, only safe URL schemes)
- Smart `Enter` behavior: leaving a heading/quote returns to a paragraph

**App**
- Sidebar with document list, create, delete
- Inline editable title
- Debounced auto-save (500 ms) with status indicator (`Saving… / Saved / Save failed`)
- Vite dev proxy forwards `/api/*` to the Express server

## Architecture (client)

```
client/src/editor/
  commands.ts   ← extensibility seam: register a command, it shows up everywhere
  keymap.ts     ← shortcut → command id resolution
  Toolbar.tsx   ← renders TOOLBAR_GROUPS from the registry
  SlashMenu.tsx ← filters SLASH_COMMANDS by query, dispatches through registry
  Editor.tsx    ← contenteditable root, wires plugins together
  sanitize.ts   ← whitelist-based HTML sanitizer for paste & loaded content
```

Adding a new format is a 3-line change: define a command in `commands.ts`, add its id to `TOOLBAR_GROUPS` (and/or `SLASH_COMMANDS`), and optionally set a `shortcut` — the toolbar, keymap, and slash menu pick it up automatically.

## API

| Method | Path                  | Description                |
|--------|-----------------------|----------------------------|
| GET    | `/api/documents`      | List (metadata only)       |
| GET    | `/api/documents/:id`  | Fetch one with content     |
| POST   | `/api/documents`      | Create `{ title, content }`|
| PUT    | `/api/documents/:id`  | Update `{ title?, content? }` |
| DELETE | `/api/documents/:id`  | Delete                     |

Documents are stored as JSON in `server/data/documents.json`. Content is stored as sanitized HTML.

## Run it

```bash
# from repo root
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

## Production build

```bash
npm run build
npm start       # serves the API; serve client/dist with any static host
```

## Design notes / trade-offs

- **Why `contenteditable` + `execCommand`?** It's the shortest path to a working editor that handles cross-node selections, undo stack, and IME. Real editors (Lexical, ProseMirror) replace this with their own state model + reconciler for cross-browser determinism and collaborative editing — the command registry here mirrors that seam so the underlying engine can be swapped without changing toolbar/keymap/slash plugins.
- **Storage as HTML**, not a JSON tree, for brevity. A production version would persist a normalized node tree (à la Lexical's `EditorState`) to enable schema validation, collaboration via CRDTs, and lossless round-tripping.
- **Sanitization** runs on paste and could also run on load — the server currently trusts whatever the client sent; for multi-user use, sanitize server-side as well.
- **Collaboration** is out of scope but the command-based architecture is collab-friendly: each command can be translated into operational transforms / CRDT mutations.
