import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SideNav } from './components/SideNav';
import { PersistentPlayer } from './player/PersistentPlayer';
import { QueueDrawer } from './components/QueueDrawer';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Album } from './pages/Album';
import { Artist } from './pages/Artist';
import { Playlist } from './pages/Playlist';
import { usePlayerStore } from './player/playerStore';
import { startSync } from './player/sync';

export function App() {
  const [queueOpen, setQueueOpen] = useState(false);
  const hydrate = usePlayerStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    startSync();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <SideNav />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/artist/:id" element={<Artist />} />
            <Route path="/playlist/:id" element={<Playlist />} />
          </Routes>
        </main>
        <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
        <PersistentPlayer onOpenQueue={() => setQueueOpen((v) => !v)} />
      </div>
    </BrowserRouter>
  );
}
