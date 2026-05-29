import { Link } from 'react-router-dom';
import type { Row } from '../types';

interface Props {
  row: Row;
}

export const RowCarousel: React.FC<Props> = ({ row }) => (
  <section className="row" aria-label={row.title}>
    <h2>{row.title}</h2>
    <div className="row-scroll">
      {row.videos.map((v) => (
        <Link key={v.id} to={`/watch/${v.id}`} className="card"
          style={{ backgroundImage: `url(${v.backdropUrl})` }}
          aria-label={v.title}
        >
          <div className="meta">
            <div className="title">{v.title}</div>
            <div className="sub">
              {v.year} · {v.maturityRating} · {v.genre}
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);
