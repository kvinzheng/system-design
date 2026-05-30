import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { Card } from '../components/Card';

export function Home() {
  const { data, loading, error } = useAsync(() => api.home(), []);
  if (loading) return <div className="status">Loading…</div>;
  if (error)   return <div className="status">Failed to load home</div>;

  return (
    <div className="page">
      <h1>Good evening</h1>
      {data!.shelves.map((shelf) => (
        <section key={shelf.id} className="shelf">
          <h2>{shelf.title}</h2>
          <div className="shelf-grid">
            {shelf.items.map((item) => item && <Card key={item.id} item={item} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
