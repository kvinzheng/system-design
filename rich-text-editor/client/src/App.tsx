import { useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from './editor/Editor';
import { api, type DocumentRecord, type DocumentSummary } from './api';

export default function App() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<DocumentRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<number | null>(null);

  // Load list on mount.
  useEffect(() => { void refreshList(); }, []);

  async function refreshList() {
    try {
      const list = await api.list();
      setDocs(list);
      if (!activeId && list.length > 0) selectDoc(list[0].id);
    } catch (e) {
      console.error(e);
    }
  }

  async function selectDoc(id: string) {
    setActiveId(id);
    setSaveStatus('idle');
    const doc = await api.get(id);
    setActive(doc);
  }

  async function createDoc() {
    const doc = await api.create('Untitled', '<p></p>');
    await refreshList();
    selectDoc(doc.id);
  }

  async function deleteDoc(id: string) {
    if (!window.confirm('Delete this document?')) return;
    await api.remove(id);
    if (activeId === id) { setActive(null); setActiveId(null); }
    await refreshList();
  }

  const scheduleSave = useMemo(() => {
    return (patch: { title?: string; content?: string }) => {
      if (!activeId) return;
      setSaveStatus('saving');
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        try {
          const updated = await api.update(activeId, patch);
          setActive((prev) => prev ? { ...prev, ...updated } : prev);
          setSaveStatus('saved');
          // Refresh list silently to update sort order / titles.
          const list = await api.list();
          setDocs(list);
        } catch (e) {
          console.error(e);
          setSaveStatus('error');
        }
      }, 500);
    };
  }, [activeId]);

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Documents</h2>
        <ul className="doc-list">
          {docs.map((d) => (
            <li
              key={d.id}
              className={d.id === activeId ? 'active' : ''}
              onClick={() => selectDoc(d.id)}
            >
              <span className="title">{d.title || 'Untitled'}</span>
              <button
                className="del"
                title="Delete"
                onClick={(e) => { e.stopPropagation(); void deleteDoc(d.id); }}
              >×</button>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={createDoc}>+ New document</button>
      </aside>

      <main className="main">
        {active ? (
          <>
            <div className="doc-header">
              <input
                className="doc-title-input"
                value={active.title}
                placeholder="Untitled"
                onChange={(e) => {
                  const title = e.target.value;
                  setActive({ ...active, title });
                  scheduleSave({ title });
                }}
              />
              <span className="save-status">
                {saveStatus === 'saving' && 'Saving…'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Save failed'}
              </span>
            </div>
            <Editor
              value={active.content || ''}
              onChange={(content) => {
                setActive((prev) => prev ? { ...prev, content } : prev);
                scheduleSave({ content });
              }}
            />
          </>
        ) : (
          <div className="empty-state">
            <div style={{ textAlign: 'center' }}>
              <p>No document selected.</p>
              <button className="btn ghost" onClick={createDoc}>Create your first document</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
