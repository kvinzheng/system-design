import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Row, Video } from '../types';
import { Billboard } from '../components/Billboard';
import { RowCarousel } from '../components/RowCarousel';

export const Discover: React.FC = () => {
  const [billboard, setBillboard] = useState<Video | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.billboard(), api.rows()])
      .then(([b, r]) => {
        setBillboard(b);
        setRows(r);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="loading">{error}</div>;
  if (!billboard || !rows) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <main>
      <Billboard video={billboard} />
      <div className="rows">
        {rows.map((row) => (
          <RowCarousel key={row.id} row={row} />
        ))}
      </div>
    </main>
  );
};
