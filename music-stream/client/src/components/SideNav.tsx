import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SideNav() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <nav className="sidenav">
      <Link to="/" className="brand">♪ MusicStream</Link>
      <ul>
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/search">Search</NavLink></li>
      </ul>
      <form onSubmit={onSearch}>
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="hint">
        Tip: queue persists across navigation and reloads.
      </div>
    </nav>
  );
}
