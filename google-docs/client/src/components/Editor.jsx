import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

const WS_URL = (() => {
  // In dev, talk to the server directly (Vite proxy only handles HTTP).
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = import.meta.env.DEV ? `${window.location.hostname}:1234` : window.location.host;
  return `${proto}://${host}/yjs`;
})();

/**
 * Collaborative rich-text editor.
 *
 * Responsibilities:
 *  - Owns a Y.Doc keyed by docId (single source of truth for content).
 *  - Mirrors it to IndexedDB so the editor opens instantly offline / on reload.
 *  - Syncs with peers via y-websocket; CRDT merges resolve all conflicts.
 *  - Surfaces remote cursors + selections via CollaborationCursor.
 */
export default function Editor({ docId, user, onStatusChange, onPeersChange }) {
  // Stable per-mount Yjs doc + providers.
  const { ydoc, provider, indexeddb } = useMemo(() => {
    const ydoc = new Y.Doc();
    const indexeddb = new IndexeddbPersistence(`doc-${docId}`, ydoc);
    const provider = new WebsocketProvider(WS_URL, docId, ydoc, { connect: true });
    return { ydoc, provider, indexeddb };
  }, [docId]);

  // Track connection status + awareness peers.
  useEffect(() => {
    const onStatus = ({ status }) => onStatusChange?.(status);
    provider.on('status', onStatus);

    const updatePeers = () => {
      const states = Array.from(provider.awareness.getStates().entries())
        .filter(([clientId]) => clientId !== provider.awareness.clientID)
        .map(([clientId, state]) => ({
          clientId,
          name: state.user?.name || 'Anonymous',
          color: state.user?.color || '#888'
        }));
      onPeersChange?.(states);
    };
    provider.awareness.on('change', updatePeers);
    updatePeers();

    return () => {
      provider.off('status', onStatus);
      provider.awareness.off('change', updatePeers);
      provider.destroy();
      indexeddb.destroy();
      ydoc.destroy();
    };
  }, [provider, indexeddb, ydoc, onStatusChange, onPeersChange]);

  // Keep awareness user state up-to-date when name/color changes.
  useEffect(() => {
    provider.awareness.setLocalStateField('user', user);
  }, [provider, user]);

  const editor = useEditor(
    {
      extensions: [
        // The StarterKit's history is replaced by Collaboration's UndoManager
        // because plain history is incompatible with multi-user editing.
        StarterKit.configure({ history: false }),
        Placeholder.configure({ placeholder: 'Start typing…' }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user
        })
      ],
      autofocus: true
    },
    [ydoc, provider]
  );

  // Push user metadata into the cursor extension on changes.
  const lastUserRef = useRef(user);
  useEffect(() => {
    if (!editor) return;
    if (lastUserRef.current?.name !== user.name || lastUserRef.current?.color !== user.color) {
      editor.chain().focus().updateUser(user).run();
      lastUserRef.current = user;
    }
  }, [editor, user]);

  return <EditorContent editor={editor} className="editor" />;
}
