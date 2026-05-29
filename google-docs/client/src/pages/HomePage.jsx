import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listDocuments, createDocument } from '../api.js';

export default function HomePage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listDocuments().then(setDocs).finally(() => setLoading(false));
  }, []);

  const onCreate = async () => {
    const meta = await createDocument('Untitled document');
    navigate(`/doc/${meta.id}`);
  };

  return (
    <div className="home">
      <header className="home__header">
        <h1>Docs</h1>
        <button className="primary" onClick={onCreate}>+ New document</button>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="empty">
          <p>No documents yet.</p>
          <button className="primary" onClick={onCreate}>Create your first document</button>
        </div>
      ) : (
        <ul className="doc-list">
          {docs.map((d) => (
            <li key={d.id}>
              <Link to={`/doc/${d.id}`}>
                <span className="doc-list__title">{d.title || 'Untitled document'}</span>
                <span className="doc-list__meta">
                  Updated {new Date(d.updatedAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
