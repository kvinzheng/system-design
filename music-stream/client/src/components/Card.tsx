import { Link } from 'react-router-dom';
import type { ShelfItem } from '../api/types';

export function Card({ item }: { item: ShelfItem }) {
  const to =
    item.kind === 'album'    ? `/album/${item.id}` :
    item.kind === 'artist'   ? `/artist/${item.id}` :
                               `/playlist/${item.id}`;
  return (
    <Link to={to} className="card">
      <img src={item.cover} alt="" />
      <div className="card-title">{item.name}</div>
      <div className="card-subtitle">
        {item.kind === 'album'    && (item as any).artist}
        {item.kind === 'playlist' && (item as any).curator}
        {item.kind === 'artist'   && 'Artist'}
      </div>
    </Link>
  );
}
