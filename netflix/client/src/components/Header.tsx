import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="logo">
        STREAMFLIX
      </Link>
      <nav>
        <Link to="/">Home</Link>
        <a href="#">TV Shows</a>
        <a href="#">Movies</a>
        <a href="#">New &amp; Popular</a>
        <a href="#">My List</a>
      </nav>
    </header>
  );
};
