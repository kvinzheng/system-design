import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '../components/Editor.jsx';
import { getDocument, renameDocument } from '../api.js';
import { getUser, setUserName } from '../user.js';

export default function DocumentPage() {
  const { id } = useParams();
  const [meta, setMeta] = useState(null);
  const [user, setUser] = useState(getUser());
  const [status, setStatus] = useState('connecting');
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    getDocument(id).then(setMeta);
  }, [id]);

  const onTitleChange = async (e) => {
    const title = e.target.value;
    setMeta((m) => ({ ...m, title }));
  };

  const onTitleBlur = async () => {
    if (!meta) return;
    await renameDocument(id, meta.title);
  };

  const onNameChange = (e) => {
    setUser(setUserName(e.target.value));
  };

  if (!meta) return <div className="doc"><p className="muted">Loading…</p></div>;

  return (
    <div className="doc">
      <header className="doc__header">
        <Link to="/" className="doc__back">← Docs</Link>
        <input
          className="doc__title"
          value={meta.title}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
          placeholder="Untitled document"
        />
        <div className="doc__right">
          <span className={`status status--${status}`}>{status}</span>
          <div className="peers">
            {peers.map((p) => (
              <span
                key={p.clientId}
                className="peer"
                style={{ background: p.color }}
                title={p.name}
              >
                {p.name.split(' ').slice(-1)[0][0]}
              </span>
            ))}
          </div>
          <input
            className="doc__name"
            value={user.name}
            onChange={onNameChange}
            aria-label="Your display name"
          />
        </div>
      </header>

      <main className="doc__main">
        <Editor
          docId={id}
          user={user}
          onStatusChange={setStatus}
          onPeersChange={setPeers}
        />
      </main>
    </div>
  );
}
