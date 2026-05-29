import React from "react";
import Masonry from "./components/Masonry.jsx";
import Header from "./components/Header.jsx";
import { usePinFeed } from "./hooks/usePinFeed.js";

export default function App() {
  const { pins, loadMore, loading, error, hasMore } = usePinFeed({ pageSize: 24 });

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Masonry
          items={pins}
          columnWidth={236}
          gutter={16}
          onEndReached={loadMore}
          hasMore={hasMore}
          loading={loading}
        />
        {error && <div className="app__error">Failed to load: {error.message}</div>}
        {!hasMore && !loading && (
          <div className="app__end">You've reached the end of the feed.</div>
        )}
      </main>
    </div>
  );
}
